<?php

namespace DeliciousBrains\WPMDB\Common\DryRun;

interface PersistenceInterface
{

    /**
     * @param DiffGroup $group
     *
     * @return mixed
     */
    public function add(DiffGroup $group);


    /**
     * @param array $options
     *
     * @return DiffGroup[]
     */
    public function retrieve($options = []);


    public function store();
}
