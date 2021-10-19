<?php

namespace DeliciousBrains\WPMDB\Common\DryRun;

class DiffGroup
{

    /**
     * @var PersistenceInterface
     */
    private $persistence;

    /**
     * @var string
     */
    private $table;

    /**
     * @var DiffEntity[]
     */
    private $entities = [];

    /**
     * @param PersistenceInterface $persistence
     */
    public function __construct(PersistenceInterface $persistence)
    {
        $this->persistence = $persistence;
    }


    /**
     * @param $table
     */
    public function setTable($table)
    {
        $this->table = $table;
    }


    /**
     * @param DiffEntity $entity
     */
    public function addEntity(DiffEntity $entity)
    {
        $this->entities[] = $entity;
    }


    /**
     * @return DiffEntity[]
     */
    public function getEntities()
    {
        return $this->entities;
    }


    /**
     * @return mixed
     */
    public function getTable()
    {
        return $this->table;
    }


    /**
     * post-find/replace procedures.
     */
    public function finalize() {
        $this->persistence->add($this);
        $this->persistence->store();
    }
}
