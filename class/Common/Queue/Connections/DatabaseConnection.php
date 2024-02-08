<?php

namespace DeliciousBrains\WPMDB\Common\Queue\Connections;

use DeliciousBrains\WPMDB\Container\Brumann\Polyfill\Unserialize;
use DateTime;
use DeliciousBrains\WPMDB\Common\Queue\Exceptions\InvalidJobTypeException;
use Exception;
use DeliciousBrains\WPMDB\Common\Queue\Job;
use wpdb;

class DatabaseConnection implements ConnectionInterface {

	/**
	 * @var wpdb
	 */
	protected $database;

    /**
     * @var array
     */
    protected $allowed_job_classes = [];

	/**
	 * @var string
	 */
	protected $jobs_table;

	/**
	 * @var string
	 */
	protected $failures_table;

    /**
     * DatabaseQueue constructor.
     *
     * @param wpdb  $wpdb
     * @param array $allowed_job_classes Job classes that may be handled, default any Job subclass.
     */
    public function __construct(wpdb $wpdb, array $allowed_job_classes = [])
    {
        $this->database            = $wpdb;
        $this->allowed_job_classes = $allowed_job_classes;
        $this->jobs_table          = $this->database->prefix . 'queue_jobs';
        $this->failures_table      = $this->database->prefix . 'queue_failures';
    }

	/**
	 * Push a job onto the queue.
	 *
	 * @param Job $job
	 * @param int $delay
	 *
	 * @return bool|int
	 */
	public function push( Job $job, $delay = 0 ) {
		$result = $this->database->insert( $this->jobs_table, array(
			'job'          => serialize( $job ),
			'available_at' => $this->datetime( $delay ),
			'created_at'   => $this->datetime(),
		) );

		if ( ! $result ) {
			return false;
		}

		return $this->database->insert_id;
	}

	/**
	 * Retrieve a job from the queue.
	 *
	 * @return bool|Job
	 */
	public function pop() {
		$this->release_reserved();

		$sql = $this->database->prepare( "
			SELECT * FROM {$this->jobs_table}
			WHERE reserved_at IS NULL
			AND available_at <= %s
			ORDER BY available_at
			LIMIT 1
		", $this->datetime() );

		$raw_job = $this->database->get_row( $sql );

		if ( is_null( $raw_job ) ) {
			return false;
		}

		$job = $this->vitalize_job( $raw_job );

        if ($job && is_a($job, Job::class)) {
            $this->reserve($job);
        }

		return $job;
	}

	/**
	 * Delete a job from the queue.
	 *
	 * @param Job $job
	 *
	 * @return bool
	 */
	public function delete( $job ) {
        if (is_a($job, Job::class)) {
            $id = $job->id();
        } elseif (is_object($job) && property_exists($job, 'id')) {
            $raw_job = (object)$job;
            $id      = $raw_job->id;
        } else {
            return false;
        }

		$where = array(
			'id' => $id,
		);

		if ( $this->database->delete( $this->jobs_table, $where ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Release a job back onto the queue.
	 *
	 * @param Job $job
	 *
	 * @return bool
	 */
	public function release( Job $job ) {
		$data  = array(
			'job'         => serialize( $job ),
			'attempts'    => $job->attempts(),
			'reserved_at' => null,
		);
		$where = array(
			'id' => $job->id(),
		);

		if ( $this->database->update( $this->jobs_table, $data, $where ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Push a job onto the failure queue.
	 *
	 * @param Job       $job
	 * @param Exception $exception
	 *
	 * @return bool
	 */
	public function failure( $job, Exception $exception ) {
		$insert = $this->database->insert( $this->failures_table, array(
			'job'       => serialize( $job ),
			'error'     => $this->format_exception( $exception ),
			'failed_at' => $this->datetime(),
		) );

		if ( $insert ) {
			$this->delete( $job );

			return true;
		}

		return false;
	}

	/**
	 * Get total jobs in the queue.
	 *
	 * @return int
	 */
	public function jobs() {
		$sql = "SELECT COUNT(*) FROM {$this->jobs_table}";

		return (int) $this->database->get_var( $sql );
	}

	/**
	 * Get total jobs in the failures queue.
	 *
	 * @return int
	 */
	public function failed_jobs() {
		$sql = "SELECT COUNT(*) FROM {$this->failures_table}";

		return (int) $this->database->get_var( $sql );
	}

	/**
	 * Reserve a job in the queue.
	 *
	 * @param Job $job
	 */
	protected function reserve( $job ) {
		$data = array(
			'reserved_at' => $this->datetime(),
		);

		$this->database->update( $this->jobs_table, $data, array(
			'id' => $job->id(),
		) );
	}

	/**
	 * Release reserved jobs back onto the queue.
	 */
	protected function release_reserved() {
		$expired = $this->datetime( -300 );

		$sql = $this->database->prepare( "
				UPDATE {$this->jobs_table}
				SET attempts = attempts + 1, reserved_at = NULL
				WHERE reserved_at <= %s", $expired );

		$this->database->query( $sql );
	}

    /**
     * Vitalize Job with latest data.
     *
     * @param mixed $raw_job
     *
     * @return Job|bool
     */
    protected function vitalize_job($raw_job)
    {
        $options = [];
        if ( ! empty($this->allowed_job_classes)) {
            $options['allowed_classes'] = $this->allowed_job_classes;
        }

        // Because we support PHP versions less than 7.0 we need to use the polyfill.
        $job = Unserialize::unserialize($raw_job->job, $options);

        if ( ! is_a($job, Job::class)) {
            $this->failure($raw_job, new InvalidJobTypeException());

            return false;
        }

        $job->set_id($raw_job->id);
        $job->set_attempts($raw_job->attempts);
        $job->set_reserved_at(empty($raw_job->reserved_at) ? null : new DateTime($raw_job->reserved_at));
        $job->set_available_at(new DateTime($raw_job->available_at));
        $job->set_created_at(new DateTime($raw_job->created_at));

        return $job;
    }

	/**
	 * Get MySQL datetime.
	 *
	 * @param int $offset Seconds, can pass negative int.
	 *
	 * @return string
	 */
	protected function datetime( $offset = 0 ) {
		$timestamp = time() + $offset;

		return gmdate( 'Y-m-d H:i:s', $timestamp );
	}

	/**
	 * Format an exception error string.
	 *
	 * @param Exception $exception
	 *
	 * @return string
	 */
	protected function format_exception( Exception $exception ) {
		$string  = get_class( $exception );
		$message = $exception->getMessage();
		if ( ! empty( $message ) ) {
			$string .= " : {$exception->getMessage()}";
		}
		$code = $exception->getCode();
		if ( ! empty( $code ) ) {
			$string .= " (#{$code})";
		}

		return $string;
	}

}
