<?php

namespace DeliciousBrains\WPMDB\Common\DryRun;

class DiffInterpreter
{

    /**
     * @var DiffGroup
     */
    private $group;


    /**
     * @param DiffGroup $group
     */
    public function __construct(DiffGroup $group)
    {
        $this->group = $group;
    }


    /**
     * Computes string difference and adds the entity to the group if diff exists.
     *
     * @param DiffEntity $entity
     */
    public function compute(DiffEntity $entity)
    {
        if (0 !== strcmp($entity->getOriginalExpression(), $entity->getReplaceExpression())) {
            $this->group->addEntity($entity);
        }
    }


    /**
     * post-find/replace procedures.
     */
    public function finalize() {
        $this->group->finalize();
    }


    /**
     * Returns array of diff entities with unmatching strings.
     *
     * @return DiffEntity[]
     */
    public function results() {
        return $this->group->getEntities();
    }

    /**
     * @return DiffGroup
     */
    public function getGroup()
    {
        return $this->group;
    }
}

