<?php
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET["id"])) {
    $sth = $db->prepare("SELECT `id`, `source`, `kind`, `ref`, `title`, `author`, `duration`, `start_at`, `end_at`, `page_url`
        FROM `sound_media`
        WHERE `song_id`=?
        ORDER BY `position`, `id`");
    $sth->execute([intval($_GET['id'])]);

    $media = [];

    while ($row = $sth->fetch()) {
        $media[] = [
            "id" => (int)$row["id"],
            "source" => $row["source"],
            "kind" => $row["kind"],
            "ref" => $row["ref"],
            "title" => $row["title"],
            "author" => $row["author"],
            "duration" => $row["duration"] === null ? null : (int)$row["duration"],
            "startAt" => $row["start_at"] === null ? null : (int)$row["start_at"],
            "endAt" => $row["end_at"] === null ? null : (int)$row["end_at"],
            "pageUrl" => $row["page_url"],
        ];
    }

    send_gzip(gzencode(json_encode($media, JSON_UNESCAPED_UNICODE)));
}

exit();
