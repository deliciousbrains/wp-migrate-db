<?php

namespace DeliciousBrains\WPMDB\Container\Dotenv\Loader;

use DeliciousBrains\WPMDB\Container\Dotenv\Repository\RepositoryInterface;
interface LoaderInterface
{
    /**
     * Load the given environment file content into the repository.
     *
     * @param \Dotenv\Repository\RepositoryInterface $repository
     * @param string                                 $content
     *
     * @throws \Dotenv\Exception\InvalidFileException
     *
     * @return array<string,string|null>
     */
    public function load(\DeliciousBrains\WPMDB\Container\Dotenv\Repository\RepositoryInterface $repository, $content);
}
