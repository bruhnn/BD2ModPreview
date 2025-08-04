type SpineAssetType = 'idle' | 'cutscene' | 'dating' | 'unknown';

interface SpineAssetInfo {
    type: SpineAssetType;
    characterId?: string;
    datingId?: string;
}

export class BD2ModDetector {
    private static readonly patterns = {
        idle: /\/spine\/char\/char(\d+)\/char\1\.skel$/,
        cutscene: /\/spine\/cutscenes\/cutscene_char(\d+)\/cutscene_char\1\.skel$/,
        dating: /\/spine\/illust\/illust_dating\/illust_dating(\d+)\/illust_dating\1\.skel$/
    };

    static detect(url: string): SpineAssetInfo {
        const idleMatch = url.match(this.patterns.idle);
        if (idleMatch) return { type: 'idle', characterId: idleMatch[1] };

        const cutsceneMatch = url.match(this.patterns.cutscene);
        if (cutsceneMatch) return { type: 'cutscene', characterId: cutsceneMatch[1] };

        const datingMatch = url.match(this.patterns.dating);
        if (datingMatch) return { type: 'dating', datingId: datingMatch[1] };

        return { type: 'unknown' };
    }
}