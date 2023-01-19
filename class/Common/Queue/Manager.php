<?php

namespace DeliciousBrains\WPMDB\Common\Queue;

use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\MigrationState\StateDataContainer;
use DeliciousBrains\WPMDB\Common\Properties\Properties;

class Manager
{

    public $queue;
    public $worker;
    public $connection;
    public $prefix;
    public $jobs_table;
    public $failures_table;
    public $wpdb;
    /**
     * @var Properties
     */
    private $properties;
    /**
     * @var StateDataContainer
     */
    private $state_data_container;
    /**
     * @var MigrationStateManager
     */
    private $migration_state_manager;
    /**
     * @var FormData
     */
    private $form_data;

    function __construct(
        Properties $properties,
        StateDataContainer $state_data_container,
        MigrationStateManager $migration_state_manager,
        FormData $form_data
    ) {
        $this->wpdb                    = $GLOBALS['wpdb'];
        $this->properties              = $properties;
        $this->state_data_container    = $state_data_container;
        $this->migration_state_manager = $migration_state_manager;
        $this->form_data               = $form_data;

        $this->prefix         = $this->properties->temp_prefix;
        $this->jobs_table     = $this->prefix . "queue_jobs";
        $this->failures_table = $this->prefix . "queue_failures";

        $this->connection = new Connection($GLOBALS['wpdb'], $properties->temp_prefix);
        $this->queue      = new Queue($this->connection, $this->prefix);
        $this->worker     = new Worker($this->connection, 1);
    }

    public function register()
    {
        add_action('wpmdb_initiate_migration', [$this, 'ensure_tables_exist']);
    }

    function enqueue_file($file)
    {
        return $this->enqueue_job(new Jobs\WPMDB_Job($file));
    }

    function enqueue_job(Job $job)
    {
        return $this->queue->push($job);
    }

    function process()
    {
        return $this->worker->process();
    }

    function ensure_tables_exist($state_data)
    {
        // ***+=== @TODO - revisit usage of parse_migration_form_data
        $form_data = $this->form_data->parse_and_save_migration_form_data($state_data['form_data']);

        if (!\in_array($state_data['intent'], ['push', 'pull', 'savefile'])) {
            return;
        }
        $stages = $form_data['current_migration']['stages'];

        $allowed_migration_types = [
            'theme_files',
            'plugin_files',
            'muplugin_files',
            'other_files',
            'core_files',
            'media_files'
        ];

        if (
            empty(array_intersect($stages, $allowed_migration_types))
        ) {
            return;
        }

        $this->create_tables(true);
    }

    function tables_exist()
    {
        return ($this->wpdb->get_var("SHOW TABLES LIKE '{$this->jobs_table}'") == $this->jobs_table && $this->wpdb->get_var("SHOW TABLES LIKE '{$this->failures_table}'") == $this->failures_table);
    }

    function create_tables($drop = false)
    {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $this->wpdb->hide_errors();
        $charset_collate = $this->wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$this->jobs_table} (
				id bigint(20) NOT NULL AUTO_INCREMENT,
				job longtext NOT NULL,
				attempts tinyint(3) NOT NULL DEFAULT 0,
				reserved_at datetime DEFAULT NULL,
				available_at datetime NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id)
				) $charset_collate;";

        if ($drop) {
            $this->wpdb->query("DROP TABLE IF EXISTS {$this->jobs_table}");
        }

        $this->wpdb->query($sql);

        $sql = "CREATE TABLE IF NOT EXISTS {$this->failures_table} (
				id bigint(20) NOT NULL AUTO_INCREMENT,
				job longtext NOT NULL,
				error text DEFAULT NULL,
				failed_at datetime NOT NULL,
				PRIMARY KEY  (id)
				) $charset_collate;";

        if ($drop) {
            $this->wpdb->query("DROP TABLE IF EXISTS {$this->failures_table}");
        }

        $this->wpdb->query($sql);
    }

    function drop_tables()
    {
        $this->wpdb->hide_errors();

        $sql = "DROP TABLE IF EXISTS {$this->jobs_table}";
        $this->wpdb->query($sql);

        $sql = "DROP TABLE IF EXISTS {$this->failures_table}";
        $this->wpdb->query($sql);
    }

    /**
     * Wrapper for DatabaseConnection::jobs()
     *
     * @return int
     */

    public function count_jobs()
    {
        return $this->connection->jobs();
    }

    /**
     *
     * @param     $count
     * @param int $offset
     *
     * @return array|null|object
     *
     */
    public function delete_data_from_queue($count = 99999999)
    {
        $sql = "DELETE FROM {$this->jobs_table} LIMIT {$count}";

        $results = $this->wpdb->query($sql);

        return $results;
    }

    public function truncate_queue()
    {
        $sql = "TRUNCATE TABLE {$this->jobs_table}";

        $results = $this->wpdb->query($sql);

        return $results;
    }

    /**
     * Get list of jobs in queue
     *
     * @param int  $limit
     * @param int  $offset
     * @param bool $raw if true, method will return serialized instead of instantiated objects
     *
     * @return array
     */
    public function list_jobs($limit = 9999999, $offset = 0, $raw = false)
    {
        return $this->connection->list_jobs($limit, $offset, $raw);
    }
}
