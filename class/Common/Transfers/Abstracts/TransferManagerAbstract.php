<?php

namespace DeliciousBrains\WPMDB\Common\Transfers\Abstracts;

use DeliciousBrains\WPMDB\Common\Queue\Manager;
use DeliciousBrains\WPMDB\Common\Transfers\Files\Payload;
use DeliciousBrains\WPMDB\Common\Transfers\Files\Util;

/**
 * Class TransferManagerAbstract
 *
 * @package DeliciousBrains\WPMDB\Pro\Transfers\Abstracts
 */
abstract class TransferManagerAbstract
{

    public function post($payload, $state_data, $action, $remote_url)
    {
    }

    public function request($file, $state_data, $action, $remote_url)
    {
    }

    public function handle_push($processed, $state_data, $remote_url)
    {
    }

    public function handle_pull($processed, $state_data, $remote_url)
    {
    }

    public function handle_savefile($processed, $state_data)
    {
    }

    /**
     *
     * Logic to handle pushes or pulls of files
     *
     * @param string $remote_url
     * @param array  $processed  list of files to transfer
     * @param array  $state_data MDB's array of $_POST[] items
     *
     * @return mixed
     * @see $this->ajax_initiate_file_migration
     *
     */
    public function manage_file_transfer($remote_url, $processed, $state_data)
    {
        if ('pull' === $state_data['intent']) {
            return $this->handle_pull($processed, $state_data, $remote_url);
        }
        if ('savefile' === $state_data['intent']) {
            return $this->handle_savefile($processed, $state_data);
        }

        return $this->handle_push($processed, $state_data, $remote_url);
    }

}
