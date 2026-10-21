<?php
// The list is cached gzipped in tmp/, one file per `ad_options.last_update`: with the version in the name
// a list can never be served under another version's label.
const SONG_CACHE_DIR = __DIR__.'/../tmp';

if (isset($_GET['id'])) {
    $sth = $db->prepare("SELECT `id`, `title`, `text`, `chord`, `tag` FROM `sound_list` WHERE `id`=?");
    $sth->execute([intval($_GET['id'])]);
    $row = $sth->fetch();

    if (!$row) {
        fail(404);
    }

    send_json(song_json($row));
}

$lastUpdate = $db->query("SELECT `last_update` FROM `ad_options` WHERE `id`=1")->fetchColumn();

// The client already holds this version of the list, so there is nothing to send.
$clientVersion = intval($_GET['last_update'] ?? 0);
if ($clientVersion > 0 && $clientVersion === (int)$lastUpdate) {
    http_response_code(204);
    exit();
}

$cacheFile = SONG_CACHE_DIR.'/_song_list_'.(int)$lastUpdate.'.json.gz';
// false as well when a save made the file outdated and a newer request removed it just now
$list = is_file($cacheFile) ? file_get_contents($cacheFile) : false;

send_gzip($list ?: update_song_cache($db, $lastUpdate, $cacheFile));

function update_song_cache(PDO $db, int|string $lastUpdate, string $cacheFile): string {
    $songs = array_map('song_json', $db->query("SELECT `id`, `title`, `text`, `chord`, `tag` FROM `sound_list`")->fetchAll());
    $list = gzencode(json_encode(['songs' => $songs, 'last_update' => $lastUpdate], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

    // Written aside and renamed, so a request reading at the same moment gets either no file or the whole of it.
    $part = $cacheFile.'.'.bin2hex(random_bytes(4)).'.part';
    if (file_put_contents($part, $list) !== false && rename($part, $cacheFile)) {
        foreach (glob(SONG_CACHE_DIR.'/_song_list_*.json.gz') ?: [] as $file) {
            if ($file !== $cacheFile) {
                @unlink($file);
            }
        }
    } else {
        @unlink($part);
    }

    return $list;
}

// `tag` is stored as "1,3,10," and sent as {"1": 1, "3": 1, "10": 1}.
function song_json(array $row): array {
    $tags = [];

    foreach (explode(',', rtrim($row['tag'] ?? '', ', ')) as $tag) {
        if ((int)$tag > 0) {
            $tags[$tag] = 1;
        }
    }

    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'text' => $row['text'],
        'chord' => $row['chord'],
        'tag' => $tags,
    ];
}
