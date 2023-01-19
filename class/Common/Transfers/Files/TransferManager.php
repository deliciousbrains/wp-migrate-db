<?php

namespace DeliciousBrains\WPMDB\Common\Transfers\Files;

use DeliciousBrains\WPMDB\Common\FullSite\FullSiteExport;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Queue\Manager;
use DeliciousBrains\WPMDB\Common\Transfers\Abstracts\TransferManagerAbstract;

/**
 * Class TransferManager
 *
 * @package WPMDB\Transfers\Files
 */
class TransferManager extends TransferManagerAbstract
{
    /**
     * @var Manager
     */
    public $queueManager;

    /**
     * @var Payload
     */
    public $payload;

    /**
     * @var Util
     */
    public $util;
    /**
     * @var Http
     */
    private $http;
     /**
     * @var FullSiteExport
     */
    private $full_site_export;

    public function __construct(
        Manager $manager,
        Util $util,
        Http $http,
        FullSiteExport $full_site_export
    ) {
        $this->queueManager     = $manager;
        $this->util             = $util;
        $this->http             = $http;
        $this->full_site_export = $full_site_export;
    }

    /**
     * @param array $processed
     * @param array $state_data
     *
     * @return array
     */
    public function handle_savefile($processed, $state_data)
    {
        $added_to_zip = $this->full_site_export->add_batch_to_zip($processed, $state_data);

        if (is_wp_error($added_to_zip)) {
            return $this->http->end_ajax($added_to_zip);
        }

        $this->queueManager->delete_data_from_queue($added_to_zip['count']);

        return $this->util->process_queue_data($processed, $state_data, $added_to_zip['total_size']);
    }
}
