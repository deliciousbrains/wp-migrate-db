<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition;

use DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper;
/**
 * Represents a reference to a container entry.
 *
 * TODO should EntryReference and AliasDefinition be merged into a ReferenceDefinition?
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class EntryReference implements \DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper
{
    /**
     * Entry name.
     * @var string
     */
    private $name;
    /**
     * @param string $entryName Entry name
     */
    public function __construct($entryName)
    {
        $this->name = $entryName;
    }
    /**
     * @return string Entry name
     */
    public function getName()
    {
        return $this->name;
    }
    /**
     * {@inheritdoc}
     */
    public function getDefinition($entryName)
    {
        return new \DeliciousBrains\WPMDB\Container\DI\Definition\AliasDefinition($entryName, $this->name);
    }
}
