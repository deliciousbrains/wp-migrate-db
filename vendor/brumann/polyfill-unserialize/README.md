Polyfill unserialize [![Build Status](https://travis-ci.org/dbrumann/polyfill-unserialize.svg?branch=master)](https://travis-ci.org/dbrumann/polyfill-unserialize)
===

Backports unserialize options introduced in PHP 7.0 to older PHP versions.
This was originally designed as a Proof of Concept for Symfony Issue
[#21090](https://github.com/symfony/symfony/pull/21090).

You can use this package in projects that rely on PHP versions older than
PHP 7.0. In case you are using PHP 7.0+ the original `unserialize()` will be
used instead.

From the [documentation](https://secure.php.net/manual/en/function.unserialize.php):

> **Warning**
>
> Do not pass untrusted user input to unserialize() regardless of the options
> value of allowed_classes. Unserialization can result in code being loaded and
> executed due to object instantiation and autoloading, and a malicious user
> may be able to exploit this. Use a safe, standard data interchange format
> such as JSON (via json_decode() and json_encode()) if you need to pass
> serialized data to the user.

Requirements
------------

 - PHP 5.3+

Installation
------------

You can install this package via composer:

```bash
composer require brumann/polyfill-unserialize "^2.0"
```

Older versions
--------------

You can find the most recent 1.x versions in the branch with the same name:

 * [dbrumann/polyfill-unserialize/tree/1.x](https://github.com/dbrumann/polyfill-unserialize/tree/1.x)

Upgrading
---------

Upgrading from 1.x to 2.0 should be seamless and require no changes to code
using the library. There are no changes to the public API, i.e. the names for
classes, methods and arguments as well as argument order and types remain the
same. Version 2.x uses a completely different approach for substituting
disallowed classes, which is why we chose to use a new major release to prevent
issues from unknown side effects in existing installations.

Known Issues
------------

There is a mismatch in behavior when `allowed_classes` in `$options` is not
of the correct type (array or boolean). PHP 7.0 will not issue a warning that
an invalid type was provided. This library will trigger a warning, similar to
the one PHP 7.1+ will raise and then continue, assuming `false` to make sure
no classes are deserialized by accident.

Tests
-----

You can run the test suite using PHPUnit. It is intentionally not bundled as
dev dependency to make sure this package has the lowest restrictions on the
implementing system as possible.

Please read the [PHPUnit Manual](https://phpunit.de/manual/current/en/installation.html)
for information how to install it on your system.

Please make sure to pick a compatible version. If you use PHP 5.6 you should
use PHPUnit 5.7.27 and for older PHP versions you should use PHPUnit 4.8.36.
Older versions of PHPUnit might not support namespaces, meaning they will not
work with the tests. Newer versions only support PHP 7.0+, where this library
is not needed anymore. 

You can run the test suite as follows:

```bash
phpunit -c phpunit.xml.dist tests/
```

Contributing
------------

This package is considered feature complete. As such I will likely not update
it unless there are security issues.

Should you find any bugs or have questions, feel free to submit an Issue or a
Pull Request on GitHub.

Development setup
-----------------

This library contains a docker setup for development purposes. This allows
running the code on an older PHP version without having to install it locally.

You can use the setup as follows:

1. Go into the project directory

1. Build the docker image

    ```
    docker build -t polyfill-unserialize .
    ```

    This will download a debian/jessie container with PHP 5.6 installed. Then
    it will download an appropriate version of phpunit for this PHP version.
    It will also download composer. It will set the working directory to `/opt/app`.
    The resulting image is tagged as `polyfill-unserialize`, which is the name
    we will refer to, when running the container. 

1. You can then run a container based on the image, which will run your tests

    ```
    docker run -it --rm --name polyfill-unserialize-dev -v "$PWD":/opt/app polyfill-unserialize
    ```

    This will run a docker container based on our previously built image.
    The container will automatically be removed after phpunit finishes.
    We name the image `polyfill-unserialize-dev`. This makes sure only one
    instance is running and that we can easily identify a running container by
    its name, e.g. in order to remove it manually.
    We mount our current directory into the container's working directory.
    This ensures that tests run on our current project's state.

You can repeat the final step as often as you like in order to run the tests.
The output should look something like this:

```bash
dbr:polyfill-unserialize/ (improvement/dev_setup*) $ docker run -it --rm --name polyfill-unserialize-dev -v "$PWD":/opt/app polyfill-unserialize
Loading composer repositories with package information
Installing dependencies (including require-dev) from lock file
Nothing to install or update
Generating autoload files
PHPUnit 5.7.27 by Sebastian Bergmann and contributors.

......................                                            22 / 22 (100%)

Time: 167 ms, Memory: 13.25MB

OK (22 tests, 31 assertions)
```

When you are done working on the project you can free up disk space by removing
the initially built image:

```
docker image rm polyfill-unserialize
```
