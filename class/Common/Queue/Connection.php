<?php

namespace DeliciousBrains\WPMDB\Common\Queue;


use WP_Error;
use wpdb;

class Connection extends Connections\DatabaseConnection {

    /**
     * DatabaseQueue constructor.
     *
     * @param wpdb   $wpdb                WP database object, default global object.
     * @param array  $allowed_job_classes Job classes that may be handled, default any Job subclass.
     * @param string $prefix              Table prefix, default temp_prefix.
     */
    public function __construct($wpdb = null, $allowed_job_classes = [], $prefix = null)
    {
	    if ( null === $wpdb || ! is_a( $wpdb, 'wpdb' ) ) {
		    $wpdb = $GLOBALS['wpdb'];
	    }
        if (null === $prefix) {
            $prefix = $GLOBALS['wpmdbpro']->get('temp_prefix');
        }

        // We should be able to call parent to set database
        // and allowed_job_classes, but unit test setup is broken
        // and throws a wobbly in Mockery. Yay, mocks. 😞
        // parent::__construct($wpdb, $allowed_job_classes);
        $this->database            = $wpdb;
        $this->allowed_job_classes = $allowed_job_classes;

        $this->jobs_table     = $prefix . 'queue_jobs';
        $this->failures_table = $prefix . 'queue_failures';
    }

	/**
	 * Get list of jobs in queue
	 *
	 * @param int  $limit
	 * @param int  $offset
	 * @param bool $raw if true, method will return serialized instead of instantiated objects
	 *
	 * @return array|WP_Error
	 */
	public function list_jobs( $limit, $offset, $raw = false ) {
		$offset  = null === $offset ? 0 : $offset;
		$limit   = null === $limit ? 9999999 : $limit;
		$raw_sql = "
			SELECT * FROM {$this->jobs_table}
			WHERE reserved_at IS NULL
			AND available_at <= %s
			LIMIT %d,%d
		";
		$sql     = $this->database->prepare( $raw_sql, $this->datetime(), $offset, $limit );
		$results = $this->database->get_results( $sql );

		if ( $raw ) {
			return $results;
		}

		$jobs = [];
		foreach ( $results as $raw_job ) {
            $job = $this->vitalize_job($raw_job);

            if ($job && is_a($job, Job::class)) {
                $jobs[$raw_job->id] = $job;
            } else {
                return new WP_Error(
                    'invalid-queue-job',
                    __('An invalid item was found in the queue of files to be transferred.', 'wp-migrate-db')
                );
            }
		}

		return $jobs;
	}
}
