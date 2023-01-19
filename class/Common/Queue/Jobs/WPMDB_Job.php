<?php

namespace DeliciousBrains\WPMDB\Common\Queue\Jobs;

use DeliciousBrains\WPMDB\Common\Queue\Job;
/**
 * Class WPMDB_Job
 *
 * @package WPMDB\Queue\Jobs
 */
class WPMDB_Job extends Job {

	public $file;

	public function __construct( $file ) {
		$this->file = $file;
	}

	/**
	 * Handle job logic.
	 */
	public function handle() {
		return true;
	}

}
