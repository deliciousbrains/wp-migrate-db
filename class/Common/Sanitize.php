<?php

namespace DeliciousBrains\WPMDB\Common;

use DeliciousBrains\WPMDB\Common\Exceptions\SanitizationFailureException;

/**
 *
 * Class Sanitize
 *
 *
 * @package DeliciousBrains\WPMDB\Common
 */
class Sanitize
{

    protected static $field_key;

    /**
     * Sanitize and validate data.
     *
     * @param string|array $data      The data to the sanitized.
     * @param string|array $key_rules The keys in the data (if data is an array) and the sanitization rule(s) to apply for each key.
     * @param string       $context   Additional context data for messages etc.
     *
     * @return array|int|mixed|string|\WP_Error
     * @throws SanitizationFailureException
     */
    public static function sanitize_data($data, $key_rules, $context)
    {
        if (empty($data) || empty($key_rules)) {
            return $data;
        }

        $result = null;

        try {
            $result = self::_sanitize_data($data, $key_rules, $context);
        } catch (\Exception $exception) {
            return new \WP_Error('wpmdb_sanitization_error', $exception->getMessage());
        }

        return $result;
    }

    protected static function create_error_string($type, $context, $data, $key)
    {
        return sprintf(__('Sanitization Error: `%1$s` method was expecting %2$s for the `%3$s` field, but got something else: "%4$s"', 'wp-db-migrate-pro'), $context, $type, $key, $data);
    }

    /**
     * Sanitize and validate data.
     *
     * @param string|array $data            The data to the sanitized.
     * @param string|array $key_rules       The keys in the data (if data is an array) and the sanitization rule(s) to apply for each key.
     * @param string       $context         Additional context data for messages etc.
     * @param int          $recursion_level How deep in the recursion are we? Optional, defaults to 0.
     *
     * @return mixed The sanitized data, the data if no key rules supplied or `false` if an unrecognized rule supplied.
     * @throws SanitizationFailureException
     */
    private static function _sanitize_data($data, $key_rules, $context, $recursion_level = 0)
    {
        if (empty($data) || empty($key_rules)) {
            return $data;
        }

        if (0 === $recursion_level && is_array($data)) {
            // We always expect associative arrays.
            if (!is_array($key_rules)) {
                throw new SanitizationFailureException(sprintf(__('%1$s was not expecting data to be an array.', 'wp-db-migrate-pro'), $context));
            }
            foreach ($data as $key => $value) {
                // If a key does not have a rule it's not ours and can be removed.
                // We should not fail if there is extra data as plugins like Polylang add their own data to each ajax request.
                if (!array_key_exists($key, $key_rules)) {
                    unset($data[$key]);
                    continue;
                }
                static::$field_key = $key;
                $data[$key]        = self::_sanitize_data($value, $key_rules[$key], $context, ($recursion_level + 1));
            }
        } elseif (is_array($key_rules)) {
            foreach ($key_rules as $rule) {
                $data = self::_sanitize_data($data, $rule, $context, ($recursion_level + 1));
            }
        } else {
            // Neither $data or $key_rules are a first level array so can be analysed.
            if ('array' === $key_rules) {
                if (!is_array($data)) {
                    throw new SanitizationFailureException(self::create_error_string('an array', $context, $data, self::$field_key));
                }
                // @TODO - Needs sanitizing
            } elseif ('string' === $key_rules) {
                if (!is_string($data)) {
                    throw new SanitizationFailureException(self::create_error_string('a string', $context, $data, self::$field_key));
                }
                $data = filter_var($data, FILTER_SANITIZE_STRING, FILTER_FLAG_NO_ENCODE_QUOTES);
            } elseif ('key' === $key_rules) {
                $key_name = sanitize_key($data);
                if ($key_name !== $data) {
                    throw new SanitizationFailureException(self::create_error_string('a valid key', $context, $data, self::$field_key));
                }
                $data = $key_name;
            } elseif ('text' === $key_rules) {
                $text = sanitize_text_field($data);
                if ($text !== trim($data)) {
                    throw new SanitizationFailureException(self::create_error_string('text', $context, $data, self::$field_key));
                }
                $data = $text;
            } elseif ('serialized' === $key_rules) {
                if (!is_string($data) || !is_serialized($data)) {
                    throw new SanitizationFailureException(self::create_error_string('serialized data', $context, $data, self::$field_key));
                }
                // @TODO - Needs sanitizing
            } elseif ('json_array' === $key_rules) {
                if (!is_string($data) || !Util\Util::is_json($data)) {
                    throw new SanitizationFailureException(self::create_error_string('JSON data', $context, $data, self::$field_key));
                }
                // @TODO - Needs sanitizing
                $data = json_decode($data, true);
            } elseif ('json' === $key_rules) {
                if (!is_string($data) || !Util\Util::is_json($data)) {
                    throw new SanitizationFailureException(self::create_error_string('JSON data', $context, $data, self::$field_key));
                }
                // @TODO - Needs sanitizing
            } elseif ('numeric' === $key_rules) {
                if (!is_numeric($data)) {
                    throw new SanitizationFailureException(self::create_error_string('a valid numeric value', $context, $data, self::$field_key));
                }
            } elseif ('int' === $key_rules) {
                // As we are sanitizing form data, even integers are within a string.
                if (!is_numeric($data) || (int)$data != $data) {
                    throw new SanitizationFailureException(self::create_error_string('an integer', $context, $data, self::$field_key));
                }
                $data = (int)$data;
            } elseif ('positive_int' === $key_rules) {
                if (!is_numeric($data) || (int)$data != $data || 0 > $data) {
                    throw new SanitizationFailureException(self::create_error_string('a positive number (int)', $context, $data, self::$field_key));
                }
                $data = floor($data);
            } elseif ('negative_int' === $key_rules) {
                if (!is_numeric($data) || (int)$data !== $data || 0 < $data) {
                    throw new SanitizationFailureException(self::create_error_string('a negative number (int)', $context, $data, self::$field_key));
                }
                $data = ceil($data);
            } elseif ('zero_int' === $key_rules) {
                if (!is_numeric($data) || (int)$data !== $data || 0 !== $data) {
                    throw new SanitizationFailureException(self::create_error_string('0 (int)', $context, $data, self::$field_key));
                }
                $data = 0;
            } elseif ('empty' === $key_rules) {
                if (!empty($data)) {
                    throw new SanitizationFailureException(self::create_error_string('an empty value', $context, $data, self::$field_key));
                }
            } elseif ('url' === $key_rules) {
                $url = esc_url_raw($data);
                if (empty($url)) {
                    throw new SanitizationFailureException(self::create_error_string('URL', $context, $data, self::$field_key));
                }
                $data = $url;
            } elseif ( 'bool' === $key_rules ) {
	            $bool = rest_sanitize_boolean( $data );

	            if ( is_bool( $bool ) ) {
		            return $bool;
	            }

	            if ( in_array( $bool, array('true', 'false') ) ) {
		            return $bool;
	            }

	            throw new SanitizationFailureException( self::create_error_string( 'a bool', $context, $data, self::$field_key ) );
            } else {
                throw new SanitizationFailureException(sprintf(__('Unknown sanitization rule "%1$s" supplied by %2$s', 'wp-db-migrate-pro'), $key_rules, $context));
            }
        }

        return $data;
    }
}
