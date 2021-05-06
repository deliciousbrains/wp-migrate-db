<?php

namespace DeliciousBrains\WPMDB\Common\Http;

class Scramble
{

    /**
     * Scramble string.
     *
     * @param mixed $input String to be scrambled.
     *
     * @return mixed
     */
    function scramble($input)
    {
        if (empty($input)) {
            return $input;
        }

        if (!\is_string($input) && !\is_bool($input)) {
            $input = serialize($input);
        }

        return 'WPMDB-SCRAMBLED' . str_replace(array('/', '\\'), array('%#047%', '%#092%'), str_rot13($input));
    }

    /**
     * Unscramble string.
     *
     * @param mixed $input String to be unscrambled.
     *
     * @return mixed
     */
    function unscramble($input)
    {
        if (!empty($input) && is_string($input)) {
            if (0 === strpos($input, 'WPMDB-SCRAMBLED')) {
                // If the string begins with WPMDB-SCRAMBED we can unscramble.
                // As the scrambled string could be multiple segments of scrambling (from stow) we remove indicators in one go.
                $input = str_replace(array('WPMDB-SCRAMBLED', '%#047%', '%#092%'), array('', '/', '\\'), $input);
                $input = str_rot13($input);
            } elseif (false !== strpos($input, 'WPMDB-SCRAMBLED')) {
                // Starts with non-scrambled data (error), but with scrambled string following.
                $pos   = strpos($input, 'WPMDB-SCRAMBLED');
                $input = substr($input, 0, $pos) . $this->unscramble(substr($input, $pos));
            }
        }

        return $input;
    }
}
