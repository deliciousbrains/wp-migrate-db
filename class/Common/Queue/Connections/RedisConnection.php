<?php

namespace DeliciousBrains\WPMDB\Common\Queue\Connections;

use Exception;
use DeliciousBrains\WPMDB\Common\Queue\Job;

class RedisConnection implements ConnectionInterface {

	/**
	 * Push a job onto the queue.
	 *
	 * @param Job $job
	 * @param int $delay
	 *
	 * @return bool|int
	 */
	public function push( Job $job, $delay = 0 ) {
		//
	}

	/**
	 * Retrieve a job from the queue.
	 *
	 * @return bool|Job
	 */
	public function pop() {
		//
	}

	/**
	 * Delete a job from the queue.
	 *
	 * @param Job $job
	 */
	public function delete( $job ) {
		//
	}

	/**
	 * Release a job back onto the queue.
	 *
	 * @param Job $job
	 */
	public function release( Job $job ) {
		//
	}

	/**
	 * Push a job onto the failure queue.
	 *
	 * @param Job       $job
	 * @param Exception $exception
	 */
	public function failure( $job, Exception $exception ) {
		//
	}

	/**
	 * Get total jobs in the queue.
	 *
	 * @return int
	 */
	public function jobs() {
		//
	}

	/**
	 * Get total jobs in the failures queue.
	 *
	 * @return int
	 */
	public function failed_jobs() {
		//
	}

}
