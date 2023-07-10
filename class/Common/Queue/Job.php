<?php

namespace DeliciousBrains\WPMDB\Common\Queue;
use DateTime;

abstract class Job {

	/**
	 * @var int
	 */
	private $id;

	/**
	 * @var int
	 */
	private $attempts;

	/**
	 * @var DateTime
	 */
	private $reserved_at;

	/**
	 * @var DateTime
	 */
	private $available_at;

	/**
	 * @var DateTime
	 */
	private $created_at;

	/**
	 * @var bool
	 */
	private $released = false;

	/**
	 * @var bool
	 */
	private $failed = false;

	/**
	 * Handle job logic.
	 */
	abstract public function handle();

	/**
	 * Get job ID.
	 *
	 * @return int
	 */
	public function id() {
		return $this->id;
	}

	/**
	 * Set job ID.
	 *
	 * @param int $id
	 */
	public function set_id( $id ) {
		$this->id = $id;
	}

	/**
	 * Get job attempts;
	 *
	 * @return int
	 */
	public function attempts() {
		return $this->attempts;
	}

	/**
	 * Set job attempts.
	 *
	 * @param int $attempts
	 */
	public function set_attempts( $attempts ) {
		$this->attempts = $attempts;
	}

	/**
	 * Get reserved at date.
	 *
	 * @return DateTime
	 */
	public function reserved_at() {
		return $this->reserved_at;
	}

	/**
	 * Set reserved at date.
	 *
	 * @param null|DateTime $reserved_at
	 */
	public function set_reserved_at( $reserved_at ) {
		$this->reserved_at = $reserved_at;
	}

	/**
	 * Get available at date.
	 *
	 * @return DateTime
	 */
	public function available_at() {
		return $this->available_at;
	}

	/**
	 * Set available at date.
	 *
	 * @param DateTime $available_at
	 */
	public function set_available_at( DateTime $available_at ) {
		$this->available_at = $available_at;
	}

	/**
	 * Get created at date.
	 *
	 * @return DateTime
	 */
	public function created_at() {
		return $this->created_at;
	}

	/**
	 * Set created at date.
	 *
	 * @param DateTime $created_at
	 */
	public function set_created_at( DateTime $created_at ) {
		$this->created_at = $created_at;
	}

	/**
	 * Flag job as released.
	 */
	public function release() {
		$this->released = true;
		$this->attempts += 1;
	}

	/**
	 * Should the job be released back onto the queue?
	 *
	 * @return bool
	 */
	public function released() {
		return $this->released;
	}

	/**
	 * Flag job as failed.
	 */
	public function fail() {
		$this->failed = true;
	}

	/**
	 * Has the job failed?
	 *
	 * @return bool
	 */
	public function failed() {
		return $this->failed;
	}

	/**
	 * Determine which properties should be serialized.
	 *
	 * @return array
	 */
	public function __sleep() {
		$object_props   = get_object_vars( $this );
		$excluded_props = array(
			'id',
			'attempts',
			'reserved_at',
			'available_at',
			'created_at',
			'released',
			'failed',
		);

		foreach ( $excluded_props as $prop ) {
			unset( $object_props[ $prop ] );
		}

		return array_keys( $object_props );
	}

}
