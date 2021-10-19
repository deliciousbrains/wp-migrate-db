<?php

namespace DeliciousBrains\WPMDB\Common\Replace;

/**
 * Class CaseInsensitivePair
 *
 * @package DeliciousBrains\WPMDB\Common\Replace
 */
class CaseInsensitivePair extends AbstractReplacePair {

    /**
     * @param string $subject
     * @return string
     */
    public function apply($subject)
    {
        return str_ireplace($this->pattern, $this->replace, $subject);
    }

}
