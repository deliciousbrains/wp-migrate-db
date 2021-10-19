<?php

namespace DeliciousBrains\WPMDB\Common\Replace;

/**
 * Class RegexPair
 *
 * @package DeliciousBrains\WPMDB\Common\Replace
 */
class RegexPair extends AbstractReplacePair
{

    /**
     * @param string $subject
     * @return string
     */
    public function apply($subject)
    {
        $replaced = preg_replace($this->pattern, $this->replace, $subject);

        if (null !== $replaced) {
            return $replaced;
        }

        return $subject;
    }

}
