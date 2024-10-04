<?php

namespace DeliciousBrains\WPMDB\Common;

use DeliciousBrains\WPMDB\Common\DryRun\DiffEntity;
use DeliciousBrains\WPMDB\Common\DryRun\DiffInterpreter;
use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Replace\ReplacePairInterface;
use DeliciousBrains\WPMDB\Common\Replace\PairFactory;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;
use DeliciousBrains\WPMDB\Common\Util\Util;

class Replace
{

    /**
     * @var
     */
    protected $search = [];
    /**
     * @var
     */
    protected $replace = [];
    /**
     * @var
     */
    protected $subdomain_replaces_on;
    /**
     * @var
     */
    protected $intent;
    /**
     * @var
     */
    protected $base_domain;
    /**
     * @var
     */
    protected $site_domain;
    /**
     * @var
     */
    protected $site_details;
    /**
     * @var
     */
    protected $source_protocol;
    /**
     * @var
     */
    protected $destination_protocol;
    /**
     * @var
     */
    protected $destination_url;
    /**
     * @var bool
     */
    protected $is_protocol_mismatch = false;

    /**
     * @var
     */
    public $state_data;
    /**
     * @var TableHelper
     */
    public $table_helper;
    /**
     * @var MigrationStateManager
     */
    public $migration_state_manager;

    /**
     * @var
     */
    protected $table;
    /**
     * @var
     */
    protected $column;
    /**
     * @var
     */
    protected $row;
    /**
     * @var ErrorLog
     */
    protected $error_log;
    /**
     * @var Util\Util
     */
    protected $util;
    /**
     * @var array
     */
    protected $json_search;
    /**
     * @var array
     */
    protected $json_replace;
    /**
     * @var array
     */
    protected $json_replace_tables;
    /**
     * @var array
     */
    protected $json_replace_columns;
    /**
     * @var FormData
     */
    private static $form_data;
    /**
     * @var bool
     */
    protected $json_merged;

    /**
     * @var array
     */
    private $regex;

    /**
     * @var array
     */
    private $case_sensitive;

    /**
     * @var ReplacePairInterface[]
     */
    private $pairs = [];

    /**
     * @var Properties
     */
    private $properties;

    /**
     * @var PairFactory
     */
    private $pair_factory;

    /**
     * @var WPMDBRestAPIServer
     */
    private $rest_api_server;

    /**
     * @var Helper
     */
    private $http_helper;

    /**
     * @var Http
     */
    private $http;

    /**
     * @var DiffInterpreter
     */
    private $diff_interpreter;

    public function __construct(
        MigrationStateManager $migration_state_manager,
        TableHelper $table_helper,
        ErrorLog $error_log,
        Util $util,
        FormData $form_data,
        Properties $properties,
        PairFactory $pairs_factory,
        WPMDBRestAPIServer $rest_api_server,
        Helper $http_helper,
        Http $http,
        DiffInterpreter $diff_interpreter
    ) {
        $this->migration_state_manager = $migration_state_manager;
        $this->table_helper            = $table_helper;
        $this->error_log               = $error_log;
        $this->util                    = $util;
        $this->properties              = $properties;
        $this->pair_factory            = $pairs_factory;
        $this->rest_api_server         = $rest_api_server;
        $this->http_helper             = $http_helper;
        $this->http                    = $http;
        $this->diff_interpreter        = $diff_interpreter;
        self::$form_data               = $form_data;

        //Setup REST API routes
        add_action('rest_api_init', [$this, 'register_rest_routes']);
    }

    public function get($prop)
    {
        return $this->$prop;
    }

    public function set($prop, $value)
    {
        return $this->$prop = $value;
    }

    public function register($args)
    {
        $keys = array(
            'table',
            'search',
            'replace',
            'regex',
            'case_sensitive',
            'intent',
            'base_domain',
            'site_domain',
            'wpmdb',
            'site_details',
        );

        if (!is_array($args)) {
            throw new \InvalidArgumentException('WPMDB_Replace constructor expects the argument to be an array');
        }

        foreach ($keys as $key) {
            if (!isset($args[$key])) {
                throw new \InvalidArgumentException("WPMDB_Replace constructor expects '$key' key to be present in the array argument");
            }
        }

        $this->table                = $args['table'];
        $this->search               = $args['search'];
        $this->replace              = $args['replace'];
        $this->regex                = $args['regex'];
        $this->case_sensitive       = $args['case_sensitive'];
        $this->intent               = $args['intent'];
        $this->base_domain          = $args['base_domain'];
        $this->site_domain          = $args['site_domain'];
        $this->site_details         = $args['site_details'];
        $this->json_search          = '';
        $this->json_replace         = '';
        $this->json_replace_tables  = '';
        $this->json_replace_columns = '';
        $this->json_merged          = false;

        // Set diff interpreter table name
        $this->diff_interpreter->getGroup()->setTable($this->table);

        global $wpdb;

        $prefix = $wpdb->base_prefix;

        $this->json_replaces($prefix);
        $this->create_pairs();

        // Detect a protocol mismatch between the remote and local sites involved in the migration
        $this->detect_protocol_mismatch();
        return $this;
    }

    private function create_pairs($search = null, $replace = null, $json_pairs = false) {
        if (null === $search) {
            $search = $this->search;
        }
        if (null === $replace) {
            $replace = $this->replace;
        }

        foreach ($search as $key => $pattern) {
            if (!$json_pairs && array_key_exists($key, $this->regex) && true === $this->regex[$key]) {
                $this->pairs[] = $this->pair_factory->create($pattern, $replace[$key], PairFactory::REGEX);
                continue;
            }
            if ( array_key_exists($key, $this->case_sensitive) && true === $this->case_sensitive[$key]) {
                $this->pairs[] = $this->pair_factory->create($pattern, $replace[$key], PairFactory::CASE_SENSITIVE);
                continue;
            }
            $this->pairs[] = $this->pair_factory->create($pattern, $replace[$key], PairFactory::CASE_INSENSITIVE);
        }
    }

    public static function parse_find_replace_pairs($intent = '', $site_url = '')
    {
        $find_replace_pairs     = [
            'regex'          => [],
            'case_sensitive' => [],
            'replace_old'    => [],
            'replace_new'    => []
        ];

        $tmp_find_replace_pairs = [];
        $migration_options     = self::$form_data->getFormData();


        if(!empty($migration_options['regex'])) {
            $find_replace_pairs['regex'] = $migration_options['regex'];
        }

        if(!empty($migration_options['case_sensitive'])) {
            $find_replace_pairs['case_sensitive'] = $migration_options['case_sensitive'];
        }


        // Standard Pairs
        if ( !empty($migration_options['search_replace']['standard_search_replace'])
            && $migration_options['search_replace']['standard_search_visible']
        ) {
            $standard_pairs = $migration_options['search_replace']['standard_search_replace'];
            foreach ($standard_pairs as $key => $pair) {
                if (!empty(trim($pair['replace'])) && in_array($key, $migration_options['search_replace']['standard_options_enabled'], true)) {
                    $tmp_find_replace_pairs[$pair['search']] = $pair['replace'];
                }
            }
        }

        // Custom pairs
        if (
            !empty($migration_options['search_replace']['custom_search_replace'])
        ) {
            $standard_pairs_count = count($tmp_find_replace_pairs);
            $custom_pairs         = $migration_options['search_replace']['custom_search_replace'];

            $i = 1;
            foreach ($custom_pairs as $pair) {
                $index = $i + $standard_pairs_count;
                if (empty($pair['replace_old']) && empty($pair['replace_new'])) {
                    $i++;
                    continue;
                }
                $tmp_find_replace_pairs[$pair['replace_old']] = $pair['replace_new'];

                if(empty($migration_options['regex']) && isset($pair['regex'])) {
                    $find_replace_pairs['regex'][$index] = $pair['regex'];
                }

                if(empty($migration_options['case_sensitive']) && isset($pair['case_sensitive'])) {
                    $find_replace_pairs['case_sensitive'][$index] = $pair['case_sensitive'];
                }

                $i++;
            }
        }

        $tmp_find_replace_pairs = apply_filters('wpmdb_find_and_replace', $tmp_find_replace_pairs, $intent, $site_url);

        if (!empty($tmp_find_replace_pairs)) {
            $i = 1;
            foreach ($tmp_find_replace_pairs as $replace_old => $replace_new) {
                $find_replace_pairs['replace_old'][$i] = $replace_old;
                $find_replace_pairs['replace_new'][$i] = $replace_new;
                $i++;
            }
        }

        return $find_replace_pairs;
    }

    /**
     * Determine whether to apply a subdomain replace over each value in the database.
     *
     * @return bool
     */
    function is_subdomain_replaces_on()
    {
        if (!isset($this->subdomain_replaces_on)) {
            $this->subdomain_replaces_on = (is_multisite() && is_subdomain_install() && !$this->has_same_base_domain() && apply_filters('wpmdb_subdomain_replace', true));
        }

        return $this->subdomain_replaces_on;
    }


    /**
     * Determine if the replacement has the same base domain as the search. Produces doubled replacement strings
     * otherwise.
     *
     * @return bool
     */
    function has_same_base_domain()
    {
        if ('push' !== $this->intent || 'pull' !== $this->intent) {
            $destination_url = $this->base_domain;
        } else {
            $destination_url = isset($this->destination_url) ? $this->destination_url : $this->site_details['local']['site_url'];
        }

        if (stripos($destination_url, $this->site_domain)) {
            return true;
        }

        return false;
    }


    /**
     * Automatically replace URLs for subdomain based multisite installations
     * e.g. //site1.example.com -> //site1.example.local for site with domain example.com
     * NB: only handles the current network site, does not work for additional networks / mapped domains
     *
     * @param $new
     *
     * @return mixed
     */
    function subdomain_replaces($new)
    {
        if (empty($this->base_domain)) {
            return $new;
        }

        $pattern     = '|//(.*?)\\.' . preg_quote($this->site_domain, '|') . '|';
        $replacement = '//$1.' . trim($this->base_domain);
        $new         = preg_replace($pattern, $replacement, $new);

        return $new;
    }

    /**
     * Detect a protocol mismatch between the remote and local sites involved in the migration
     *
     * @return bool
     */
    function detect_protocol_mismatch()
    {
        if (!isset($this->site_details['remote']) && 'import' !== $this->intent) {
            return false;
        }

        $wpmdb_home_urls = array(
            // TODO: rewrite unit tests that only pass site_url so that we can rely on home_url's existence
            'local' => isset($this->site_details['local']['home_url']) ? $this->site_details['local']['home_url'] : $this->site_details['local']['site_url'],
        );

        if ('import' !== $this->intent) {
            $wpmdb_home_urls['remote'] = isset($this->site_details['remote']['home_url']) ? $this->site_details['remote']['home_url'] : $this->site_details['remote']['site_url'];
        } else {
            $this->state_data = $this->migration_state_manager->set_post_data();

            if (!isset($this->state_data['import_info']) || !isset($this->state_data['import_info']['protocol'])) {
                return false;
            }
            $wpmdb_home_urls['remote'] = $this->state_data['import_info']['protocol'] . ':' . $this->state_data['import_info']['URL'];
        }

        /**
         * Filters the site_urls used to check if there is a protocol mismatch.
         *
         * @param array
         */
        $wpmdb_home_urls = apply_filters('wpmdb_replace_site_urls', $wpmdb_home_urls);

        $local_url_is_https  = false === stripos($wpmdb_home_urls['local'], 'https') ? false : true;
        $remote_url_is_https = false === stripos($wpmdb_home_urls['remote'], 'https') ? false : true;
        $local_protocol      = $local_url_is_https ? 'https' : 'http';
        $remote_protocol     = $remote_url_is_https ? 'https' : 'http';

        if (($local_url_is_https && !$remote_url_is_https) || (!$local_url_is_https && $remote_url_is_https)) {
            $this->is_protocol_mismatch = true;
        }

        if ('push' === $this->intent) {
            $this->destination_protocol = $remote_protocol;
            $this->source_protocol      = $local_protocol;
            $this->destination_url      = $wpmdb_home_urls['remote'];
        } else {
            $this->destination_protocol = $local_protocol;
            $this->source_protocol      = $remote_protocol;
            $this->destination_url      = $wpmdb_home_urls['local'];
        }

        return $this->is_protocol_mismatch;
    }

    /**
     *
     * Handles replacing the protocol if the local and destination don't have matching protocols (http > https and
     * vice-versa).
     *
     * Can be filtered to disable entirely.
     *
     * @param string $new
     * @param string $destination_url
     *
     * @return mixed
     */
    function do_protocol_replace($new, $destination_url)
    {
        /**
         * Filters $do_protocol_replace, return false to prevent protocol replacement.
         *
         * @param bool true                   If the replace should be skipped.
         * @param string $destination_url The URL of the target site.
         */
        $do_protocol_replace = apply_filters('wpmdb_replace_destination_protocol', true, $destination_url);

        if (true !== $do_protocol_replace) {
            return $new;
        }

        $parsed_destination = Util::parse_url($destination_url);
        unset($parsed_destination['scheme']);

        if (isset($parsed_destination['port'])) {
            $parsed_destination['port'] = ':' . $parsed_destination['port'];
        }

        $protocol_search  = $this->source_protocol . '://' . implode('', $parsed_destination);
        $protocol_replace = $destination_url;
        // JSON search & replace
        if (
            in_array($this->table, $this->json_replace_tables)
            && in_array($this->column, $this->json_replace_columns)
        ) {
            $protocol_search  = [$protocol_search, Util::json_encode_trim($protocol_search)];
            $protocol_replace = [$protocol_replace, Util::json_encode_trim($protocol_replace)];
        }
        $new              = str_ireplace($protocol_search, $protocol_replace, $new, $count);

        return $new;
    }


    public function maybe_merge_json_replaces()
    {
        if ($this->json_merged) {
            return false;
        }

        if (
            !in_array($this->table, $this->json_replace_tables) ||
            !in_array($this->column, $this->json_replace_columns)
        ) {
            return false;
        }

        if (empty($this->search) && empty($this->replace)) {
            return false;
        }

        if (!is_array($this->json_search) || !is_array($this->json_replace)) {
            return false;
        }

        //Create the json replace pairs.
        $this->create_pairs($this->json_search, $this->json_replace, true);

        //Only add json replacements once
        $this->json_merged = true;

        return true;
    }

    /**
     * Applies find/replace pairs to a given string.
     *
     * @param string $subject
     *
     * @return string
     */
    public function apply_replaces($subject)
    {
        $original = $subject;

        if (empty($this->search) && empty($this->replace)) {
            return $subject;
        }

        if (count($this->search) !== count($this->replace)) {
            return $subject;
        }

        $this->maybe_merge_json_replaces(); // Maybe merge in json_encoded find/replace values

        foreach ($this->pairs as $pair) {
            $subject = $pair->apply($subject);
        }

        if ($this->is_subdomain_replaces_on()) {
            $subject = $this->subdomain_replaces($subject);
        }

        if (true === $this->is_protocol_mismatch) {
            $subject = $this->do_protocol_replace($subject, $this->destination_url);
        }

        if ('find_replace' === $this->intent) {
            $row = null;
            if (is_object($this->row) ) {
                $get_vars = function_exists('get_mangled_object_vars') ? get_mangled_object_vars($this->row) : $this->row;
                $row      = reset($get_vars);
            }
            $this->diff_interpreter->compute(DiffEntity::create($original, $subject, $this->column, $row));
        }

        return $subject;
    }

    /**
     * Take a serialized array and unserialize it replacing elements as needed and
     * unserialising any subordinate arrays and performing the replace on those too.
     *
     * Mostly from https://github.com/interconnectit/Search-Replace-DB
     *
     * @param mixed $data              Used to pass any subordinate arrays back to in.
     * @param bool  $serialized        Does the array passed via $data need serialising.
     * @param bool  $parent_serialized Passes whether the original data passed in was serialized
     * @param bool  $filtered          Should we apply before and after filters successively
     *
     * @return mixed    The original array with all elements replaced as needed.
     */
    function recursive_unserialize_replace($data, $serialized = false, $parent_serialized = false, $filtered = true)
    {
        $pre = apply_filters('wpmdb_pre_recursive_unserialize_replace', false, $data, $this);
        if (false !== $pre) {
            return $pre;
        }

        //If the intent is find_replace we need to prefix the tables with the temp prefix and wp base table prefix.
        global $wpdb;
        $table_prefix = $wpdb->base_prefix;
        if ( 'find_replace' === $this->get_intent() ) {

            $table_prefix = $this->properties->temp_prefix . $table_prefix;
        }

        //Check if find and replace needs be skipped for the current table
        $skipped_tables = apply_filters('wpmdb_skip_search_replace_tables', ['eum_logs']);
        foreach ($skipped_tables as $skipped_table) {
            if ($this->table === $table_prefix . $skipped_table) {
                return $data;
            }
        }

        if ($this->should_do_reference_check($table_prefix) && is_serialized( $data ) && preg_match('/r\:\d+;/i', $data)) {
            $current_row   = $this->get_row();
            $first_row_key = reset($current_row);
            $skipped       = [
                'table'          => str_replace('_mig_', '', $this->get_table()),
                'primary_key'    => $first_row_key,
                'column'         => $this->get_column(),
                'contains_match' => $this->has_skipped_values($data)
            ];

            if (property_exists($this->get_row(), 'option_name') && $this->table_is('options', $table_prefix)) {
                $skipped['option_name'] = $this->get_row()->option_name;
            }

            error_log('WPMDB Find & Replace skipped: ' . json_encode($skipped));
            return $data;
        }

        $is_json           = false;
        $before_fired      = false;
        $successive_filter = $filtered;

        if (true === $filtered) {
            list($data, $before_fired, $successive_filter) = apply_filters('wpmdb_before_replace_custom_data', array(
                $data,
                $before_fired,
                $successive_filter,
            ), $this);
        }

        // some unserialized data cannot be re-serialized eg. SimpleXMLElements
        try {
            if (is_string($data) && ($unserialized = Util::unserialize($data, __METHOD__)) !== false) {
                // PHP currently has a bug that doesn't allow you to clone the DateInterval / DatePeriod classes.
                // We skip them here as they probably won't need data to be replaced anyway
                if (
                    'object' == gettype($unserialized) && 
                    (
                        $unserialized instanceof \DateInterval ||
                        $unserialized instanceof \DatePeriod
                    )
                ) {
                    return $data;
                }
                $data = $this->recursive_unserialize_replace($unserialized, true, true, $successive_filter);
            } elseif (is_array($data)) {
                $_tmp = array();
                foreach ($data as $key => $value) {
                    $_tmp[$key] = $this->recursive_unserialize_replace($value, false, $parent_serialized, $successive_filter);
                }

                $data = $_tmp;
                unset($_tmp);
            //is_object does not return true for __PHP_Incomplete_Class until 7.2 using gettype instead
            } elseif ('object' == gettype($data)) { // Submitted by Tina Matter
                if ($this->is_object_cloneable($data)) {
                    $_tmp = clone $data;
                    foreach ($data as $key => $value) {
                        // Integer properties are crazy and the best thing we can do is to just ignore them.
                        // see http://stackoverflow.com/a/10333200 and https://github.com/deliciousbrains/wp-migrate-db-pro/issues/853
                        if (is_int($key)) {
                            continue;
                        }
                        $_tmp->$key = $this->recursive_unserialize_replace($value, false, $parent_serialized, $successive_filter);
                    }

                    $data = $_tmp;
                    unset($_tmp);
                }
            } elseif (Util::is_json($data, true)) {
                $_tmp = array();
                $data = json_decode($data, true);

                foreach ($data as $key => $value) {
                    $_tmp[$key] = $this->recursive_unserialize_replace($value, false, $parent_serialized, $successive_filter);
                }

                $data = $_tmp;
                unset($_tmp);
                $is_json = true;
            } elseif (is_string($data)) {
                list($data, $do_replace) = apply_filters('wpmdb_replace_custom_data', array($data, true), $this);

                if ($do_replace) {
                    $data = $this->apply_replaces($data);
                }
            }

            if ($is_json) {
                $flags = apply_filters('wpmdb_replace_json_encode_flags', 0, $data, $this);
                $data  = json_encode($data, $flags);
            }

            if ($serialized) {
                $data = serialize($data);
            }
        } catch (\Exception $error) {
            $error_msg     = __('Failed attempting to do the recursive unserialize replace. Please contact support.', 'wp-migrate-db');
            $error_details = $error->getMessage() . "\n\n";
            $error_details .= var_export($data, true);
            $this->error_log->log_error($error_msg, $error_details);
        }

        if (true === $filtered) {
            $data = apply_filters('wpmdb_after_replace_custom_data', $data, $before_fired, $this);
        }

        return $data;
    }

    /**
     * Search unseralized string for potential match
     *
     * @param string $data
     * @return bool
     **/
    protected function has_skipped_values($data)
    {
        foreach( $this->search as $search_string) {
            if (false !== strpos($data, $search_string)){
                return true;
            }
        }
        return false;
    }

    /**
     * Table and cloumns to search for references
     * @param string $table_prefix
     * @return bool
     **/
    protected function should_do_reference_check($table_prefix)
    {
        if ( $this->table_is('options', $table_prefix) && 'option_value' === $this->get_column()) {
            return true;
        }
        $table_column_for_check = [
            [
                'table' => $table_prefix . 'duplicator_packages',
                'column' => 'package'
            ],
            [
                'table' => $table_prefix . 'aiowps_audit_log',
                'column' => 'stacktrace'
            ]
        ];
        $table_column_for_check = apply_filters('wpmdb_check_table_column_for_reference', $table_column_for_check);
        foreach($table_column_for_check as $table_column ) {
            if (
                array_key_exists('table', $table_column)
                && $table_column['table'] === $this->get_table()
                && array_key_exists('column', $table_column)
                && $table_column['column'] === $this->get_column()
                ) {
                return true;
            }
        }

        return false;
    }


    /**
     * Getter for the $table class property.
     *
     * @return string Name of the table currently being processed in the migration.
     */
    public function get_table()
    {
        return $this->table;
    }

    /**
     * Getter for the $column class property.
     *
     * @return string Name of the column currently being processed in the migration.
     */
    public function get_column()
    {
        return $this->column;
    }

    /**
     * Getter for the $row class property.
     *
     * @return string Name of the row currently being processed in the migration.
     */
    public function get_row()
    {
        return $this->row;
    }

    /**
     * Setter for the $column class property.
     *
     * @param string $column Name of the column currently being processed in the migration.
     */
    public function set_column($column)
    {
        $this->column = $column;
    }

    /**
     * Setter for the $row class property.
     *
     * @param string $row Name of the row currently being processed in the migration.
     */
    public function set_row($row)
    {
        $this->row = $row;
    }

	/**
	 * Multsite safe way of comparing the table currently being processed in the migration against a desired table.
	 *
	 * The table prefix should be omitted, example:
	 *
	 * $is_posts = $this->table_is( 'posts' );
	 *
	 * @TODO Cover table prefixing with Unit Tests
	 *
	 * @param  string $desired_table Name of the desired table, table prefix omitted.
	 * @param  string $prefix        The table prefix
	 *
	 * @return boolean                Whether or not the desired table is the table currently being processed.
	 */
	public function table_is( $desired_table, $prefix = '' ) {
		return $this->table_helper->table_is( $desired_table, $this->table, 'table', $prefix );
	}

    /**
     * Intent of the current replace migration.
     *
     * Helpful for hookers who need to know what intent they are working on.
     *
     * @return string Intent of the current migration
     */
    public function get_intent()
    {
        return $this->intent;
    }

    /**
     * @param string $prefix
     */
    protected function json_replaces($prefix)
    {
        $prefix         = in_array($this->intent, ['find_replace', 'import']) ? '_mig_' . $prefix : $prefix;
        $default_tables = [
            "{$prefix}posts",
        ];

        // Account for multisite subsites.
        if (is_multisite()) {
            $pattern = '/^' . $prefix . '\d+_posts$/';
            if (preg_match($pattern, $this->table)) {
                $default_tables = [$this->table];
            }
        }

        $this->json_replace_tables = apply_filters('wpmdb_json_replace_tables', $default_tables);

        $this->json_replace_columns = apply_filters('wpmdb_json_replace_columns', [
            'post_content',
            'post_content_filtered',
        ]);

        if (empty($this->search) && empty($this->replace)) {
            return;
        }

        if (is_array($this->search)) {
            $this->json_search = array_map(function ($item) {
                return Util::json_encode_trim($item);
            }, $this->search);
        }

        if (is_array($this->replace)) {
            $this->json_replace = array_map(function ($item) {
                return Util::json_encode_trim($item);
            }, $this->replace);
        }
    }

    /**
     * @throws \WP_CLI\ExitException
     * @throws \DI\DependencyException
     * @throws \DI\NotFoundException
     */
    public function validate_regex_pattern() {
       $_POST = $this->http_helper->convert_json_body_to_post();
        if (isset($_POST['pattern'])) {
            $pattern = Util::safe_wp_unslash($_POST['pattern']);
            if (Util::is_regex_pattern_valid( $pattern ) === false) {
                return $this->http->end_ajax(false);
            }
        }
        $key_rules = array(
            'pattern' => 'regex',
        );

        $state_data = $this->migration_state_manager->set_post_data( $key_rules );
        return $this->http->end_ajax(isset($state_data['pattern']) === true);
    }

    public function register_rest_routes() {
        $this->rest_api_server->registerRestRoute('/regex-validate', [
            'methods'  => 'POST',
            'callback' => [ $this, 'validate_regex_pattern' ],
        ]);
    }


    /**
     * Check if a given object can be cloned.
     *
     * @param object $object
     *
     * @return bool
     */
    private function is_object_cloneable($object) {
        return (new \ReflectionClass(get_class($object)))->isCloneable();
    }

    /**
     * Empties pairs array
     */
    public function reset_pairs() {
        $this->pairs = [];
    }


    /**
     * @return DiffInterpreter
     */
    public function get_diff_interpreter() {
        return $this->diff_interpreter;
    }


    /**
     * Returns an array of json serialized entities.
     *
     * @return array
     */
    public function get_diff_result() {
        $result = [];
        foreach($this->diff_interpreter->getGroup()->getEntities() as $entity) {
            $result[] = $entity->jsonSerialize();
        }
        return $result;
    }
}
