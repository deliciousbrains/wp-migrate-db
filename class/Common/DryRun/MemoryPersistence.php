<?php

namespace DeliciousBrains\WPMDB\Common\DryRun;

/**
 * In memory persistence layer for find/replace diff entities.
 */
class MemoryPersistence implements PersistenceInterface {

    /**src/wp-migrate-db-pro/frontend/src/common/components/ComboButton.js
     * @var DiffGroup[]
     */
    private $store = [];


    /**
     * @param DiffGroup $group
     *
     * @return void
     */
    public function add(DiffGroup $group)
    {
        $this->store[] = $group;
    }


    /**
     * @param array $options
     *
     * @return DiffGroup[]
     */
    public function retrieve($options = [])
    {
        return $this->store;
    }

    public function store()
    {
        // TODO: Implement store() method.
    }
}
