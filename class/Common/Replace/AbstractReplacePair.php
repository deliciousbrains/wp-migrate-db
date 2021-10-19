<?php

namespace DeliciousBrains\WPMDB\Common\Replace;

/**
 * Class AbstractReplacePairInterface
 *
 * @package DeliciousBrains\WPMDB\Common\Replace
 */
abstract class AbstractReplacePair implements ReplacePairInterface {

    /**
     * @var string
     */
    protected $pattern;
    /**
     * @var string
     */
    protected $replace;

    /**
     * AbstractReplacePairInterface constructor.
     *
     * @param string $pattern
     * @param string $replace
     */
    public function __construct($pattern, $replace) {
        $this->pattern = $pattern;
        $this->replace = $replace;
    }

    /**
     * @param string $subject
     * @return string
     */
    public function apply($subject)
    {
        return $subject;
    }
}
