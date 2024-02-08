<?php

namespace DeliciousBrains\WPMDB\Common\Http;

use DeliciousBrains\WPMDB\Common\Util\Util;

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
            $input = json_encode($input);
        }

        return 'WPMDB-SCRAMBLED' . str_replace(array('/', '\\'), array('%#047%', '%#092%'), str_rot13($input));
    }

    /**
     * Unscramble string.
     *
     * @param mixed $input      String to be unscrambled.
     * @param bool  $doing_json Are we already processing some JSON?
     *
     * @return mixed
     */
    function unscramble($input, $doing_json = false)
    {
        if ( ! empty($input) && is_string($input) && (false !== strpos($input, 'WPMDB-SCRAMBLED') || $doing_json)) {
            // We know we have scrambled data, but was it JSON encoded afterwards?
            if (Util::is_json($input)) {
                $input = json_decode($input, true);
                if (is_array($input)) {
                    foreach ($input as $key => $val) {
                        $input[$key] = $this->unscramble($val, true);
                    }
                } else {
                    $input = $this->unscramble($input, true);
                }

                // Re-encode just once when finished doing JSON.
                if ( ! $doing_json) {
                    $input = json_encode($input);
                }
            } elseif (0 === strpos($input, 'WPMDB-SCRAMBLED')) {
                // If the string begins with WPMDB-SCRAMBED we can unscramble.
                // As the scrambled string could be multiple segments of scrambling (from stow) we remove indicators in one go.
                $input = str_replace(array('WPMDB-SCRAMBLED', '%#047%', '%#092%'), array('', '/', '\\'), $input);
                $input = str_rot13($input);
            } elseif (false !== strpos($input, 'WPMDB-SCRAMBLED')) {
                // Starts with non-scrambled data (error), but with scrambled string following.
                $pos   = strpos($input, 'WPMDB-SCRAMBLED');
                $input = substr($input, 0, $pos) . $this->unscramble(substr($input, $pos), $doing_json);
            }
        }

        return $input;
    }
}
