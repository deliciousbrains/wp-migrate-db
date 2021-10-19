<?php

namespace DeliciousBrains\WPMDB\Common\Replace;

/**
 * Class PairFactory
 *
 * Used to create search and replace pairs instances.
 *
 * @package DeliciousBrains\WPMDB\Common\Replace
 */
class PairFactory {

    const REGEX = 'REGEX';
    const CASE_SENSITIVE = 'CASE_SENSITIVE';
    const CASE_INSENSITIVE = 'CASE_INSENSITIVE';

    /**
     * @param string $pattern
     * @param string $replace
     * @param string $type
     *
     * @return ReplacePairInterface
     */
    public function create($pattern, $replace, $type = self::CASE_INSENSITIVE) {
        switch($type) {
            case self::REGEX:
                return new RegexPair($pattern, $replace);
            case self::CASE_SENSITIVE:
                return new CaseSensitivePair($pattern, $replace);
            default:
                return new CaseInsensitivePair($pattern, $replace);
        }
    }
}
