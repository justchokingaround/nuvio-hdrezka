/**
 * Minimal debug provider. Returns one public-domain sample stream
 * regardless of input, to test whether Nuvio loads provider files at all.
 */
function getStreams(tmdbId, mediaType, season, episode) {
    return [
        {
            name: 'DebugProvider',
            title: 'Debug 1080p',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            quality: '1080p',
        },
    ];
}

module.exports = { getStreams };
