<?php
// Uploaded recordings live in media/, which the deploy never touches (see the rsync excludes).
const MEDIA_UPLOAD_DIR = __DIR__.'/../media';
// the same list as AUDIO_EXTENSIONS in song-media-player.ts
const MEDIA_UPLOAD_EXTENSIONS = 'mp3|m4a|aac|ogg|oga|opus|wav|flac';
const MEDIA_UPLOAD_NAME = '^[0-9a-f]{16}\.('.MEDIA_UPLOAD_EXTENSIONS.')$';
const MEDIA_UPLOAD_REF = '/'.MEDIA_UPLOAD_NAME.'/';

function media_upload_path(string $ref): string {
    return MEDIA_UPLOAD_DIR.'/'.$ref;
}

// Called after a record stops pointing at an uploaded file; another record may still use it.
function delete_unused_upload(PDO $db, string $ref): void {
    if (!preg_match(MEDIA_UPLOAD_REF, $ref)) {
        return;
    }

    $sth = $db->prepare("SELECT 1 FROM `sound_media` WHERE `source`='upload' AND `ref`=? LIMIT 1");
    $sth->execute([$ref]);

    if (!$sth->fetch() && is_file(media_upload_path($ref))) {
        unlink(media_upload_path($ref));
    }
}
