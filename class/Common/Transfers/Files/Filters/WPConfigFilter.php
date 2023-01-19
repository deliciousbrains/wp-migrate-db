<?php

namespace DeliciousBrains\WPMDB\Common\Transfers\Files\Filters;

class WPConfigFilter implements FilterInterface {
    private $state_data;

    public function filter($file)
    {
        //Open a temporary file for writing
        $tmp_filename = tempnam("/tmp", "wp-config");
        $tmp_file             = fopen($tmp_filename, 'wb');
        $path                 = stream_get_meta_data($tmp_file)['uri'];
        $original_file_handle = fopen($file['absolute_path'], 'rb');

        //Loop through the original file, line by line
        while (($line = fgets($original_file_handle)) !== false) {
           $line = $this->constants_filter($line);
           $line = $this->db_prefix_filter($line);

            //Write the line to the temporary file
            fwrite($tmp_file, $line);
        }

        fclose($original_file_handle);
        fclose($tmp_file);

        //adjust the absolute path to the temporary file
        $file['absolute_path'] = $path;
        return $file;
    }

    public function can_filter($file, $state_data)
    {
        $this->state_data = $state_data;

        //Only filter wp-config.php for a subsite export
        return $file['name'] === 'wp-config.php'
               && isset($state_data['stages'], $state_data['mst_selected_subsite'])
               && json_decode($state_data['stages']) !== ['tables']
               && 'savefile' === $state_data['intent']
               && '0' !== $state_data['mst_selected_subsite'];
    }

    /**
     * Filters the multisite constants
     *
     * @param $line
     *
     * @return mixed|string
     */
    private function constants_filter($line) {
        //Targeted multisite constants
        $constants = ['WP_ALLOW_MULTISITE', 'MULTISITE', 'SUBDOMAIN_INSTALL', 'DOMAIN_CURRENT_SITE', 'PATH_CURRENT_SITE', 'SITE_ID_CURRENT_SITE', 'BLOG_ID_CURRENT_SITE'];
        //If the line contains the MULTISITE constants, comment it
        foreach ($constants as $constant) {
            if (preg_match("~\b$constant\b~",$line)) {
                $line = '// ' . $line;
            }
        }

        return $line;
    }

    /**
     * Filters the DB prefix variable
     *
     * @param string $line
     * @return string
     */
    private function db_prefix_filter($line)
    {
        //If the line contains the $table_prefix variable, match it and extract the value
        $regex = '~[$]\btable_prefix\b[=]((?:\'|").*(?:\'|"))~';
        $adjusted_line = str_replace(' ', '', $line);
        preg_match($regex, $adjusted_line, $matches);

        //If the matched prefix is not the same as the original prefix, comment it and add the new prefix
        if (isset($matches[0], $matches[1], $this->state_data['new_prefix']) && str_replace(['"', "'"], "",
                $matches[1]) !== $this->state_data['new_prefix']) {
            $adjusted_line = "//  $adjusted_line \n";
            $adjusted_line .= '$table_prefix = \'' . $this->state_data['new_prefix'] . '\';';

            return $adjusted_line;
        }

        return $line;
    }
}
