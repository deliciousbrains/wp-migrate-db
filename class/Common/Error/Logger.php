<?php

namespace DeliciousBrains\WPMDB\Common\Error;

use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;

/**
 * Adds log messages about migrations
 */
class Logger
{

    /**
     * register hooks
     **/
    public function register()
    {
        add_action('wpmdb_initiate_migration', [$this, 'initiate']);
        add_action('wpmdb_after_finalize_migration', [$this, 'complete']);
        add_action('wpmdb_cancellation', [$this, 'cancellation']);
        add_action('wpmdb_respond_remote_initiate', [$this, 'remoteInitiate'], 10, 1);
        add_action('wpmdb_remote_finalize', [$this, 'remoteFinalize'], 10, 1);
        add_action('wpmdb_respond_to_push_cancellation', [$this, 'remoteCancellation']);
    }

    /**
     * Logs message to error log
     *
     * @param array $args
     * @param array $state_data
     **/
    public function logMessage($args, $state_data = [])
    {
        $extra_data  = Persistence::getStateData();
        $state_data  = array_merge($state_data, $extra_data);
        $target      = ('pull' === $state_data['intent'] && 'local' === $args['location'])  || ('push' === $state_data['intent'] && 'remote' === $args['location']);
        $log_message = 'WPMDB: ';
        $stats       = [
            'type'     => $args['type'],
            'location' => $args['location'],
            'target'   => isset($args['target']) ? $args['target'] : $target
        ];
       
        if (isset($state_data['site_url'], $state_data['url'])) {
            $stats['sites'] = [
                'local'  =>  $state_data['site_url'],
                'remote' => $state_data['url']
            ];
        }

        if (isset($state_data['migration_state_id'])) {
            $stats['migration_id'] = $state_data['migration_state_id'];
        }

         if (isset($state_data['remote_state_id'])) {
            $stats['migration_id'] = $state_data['remote_state_id'];
        }
                
        error_log($log_message . json_encode($stats));
    }

    /**
     * Hooked to 'wpmdb_initiate_migration'
     *
     * @param array $state_data
     **/
    public function initiate($state_data)
    {
        $args = [
            'type'     => 'initiate',
            'location' => 'local'
        ];
        $this->logMessage($args, $state_data);
    }

    /**
     * Hooked to 'wpmdb_respond_remote_initiate'
     *
     * @param array $state_data
     **/
    public function remoteInitiate($state_data)
    {
        $args = [
            'type'     => 'initiate',
            'location' => 'remote'
        ];
        $this->logMessage($args, $state_data);
    }

    /**
     * Hooked to 'wpmdb_remote_finalize'
     *
     * @param array $state_data
     **/
    public function remoteFinalize($state_data)
    {
        $args =  [
            'type'     => 'complete',
            'location' => 'remote',
            'target'   => true
        ];
        $this->logMessage($args, $state_data);
    }

    /**
     * Log on migration complete
     * Hooked to 'wpmdb_after_finalize_migration'
     **/
    public function complete()
    {
        $args = [
            'type'     => 'complete',
            'location' => 'local'
        ];
        $this->logMessage($args);
    }

    /**
     * Cancellation log
     * Hooked to 'wpmdb_cancellation'
     **/
    public function cancellation()
    {
        $args = [
            'type'     => 'cancel',
            'location' => 'local'
        ];
        $this->logMessage($args);
    }

    /**
     * Remote cancellation log
     * Hooked to 'wpmdb_respond_to_push_cancellation'
     **/
    public function remoteCancellation()
    {
        $args = [
            'type'     => 'cancel',
            'location' => 'remote'
        ];
        $this->logMessage($args);
    }
}
