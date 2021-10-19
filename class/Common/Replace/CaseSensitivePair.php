<?php

namespace DeliciousBrains\WPMDB\Common\Replace;

/**
 * Class CaseSensitivePair
 *
 * @package DeliciousBrains\WPMDB\Common\Replace
 */
class CaseSensitivePair extends AbstractReplacePair
{

    /**
     * @param string $subject
     *
     * @return string
     */
    public function apply($subject)
    {
        return str_replace($this->pattern, $this->replace, $subject);
    }

}
