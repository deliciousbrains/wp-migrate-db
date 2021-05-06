<?php


namespace DeliciousBrains\WPMDB;

/**
 * Class Container
 *
 * THIS CLASS EXISTS AS A BACK-COMPAT FOR PRE 2.0 VERSIONS OF THE PLUGIN AND ADDONS
 *
 * @package DeliciousBrains\WPMDB
 */
class Container
{

    public $providers = [];
    public $classes = [];
    public $props;

    public static function getInstance()
    {
    }

    public function get()
    {
        //For back-compat
        return $this;
    }

    public function addClass($key, $instance)
    {
        $this->classes[$key] = $instance;

        return $instance;
    }

    //For back-compat
    public function add($key, $instance)
    {
        return $this;
    }

    public function has($id)
    {
        if (!array_key_exists($id, $this->classes)) {
            return true;
        }

        return false;
    }

    //For back-compat
    public function withArguments()
    {
        //NoOp
    }

    //For back-compat
    public function register()
    {
        //NoOp
    }
}
