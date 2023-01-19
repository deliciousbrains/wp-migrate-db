<?php

namespace DeliciousBrains\WPMDB\Common\Transfers\Files;

/**
 * Class Chunker
 *
 * When pushing, large files need to be broken up so that a remote's `post_max_size` and `upload_max_filesize` aren't hit
 *
 * @package WPMDB\Transfers\Files
 */
class Chunker {

	public $util;

	/**
	 * @param Util        $util
	 */
	public function __construct( Util $util ) {
		$this->util  = $util;
	}

	/**
	 * @param string $id
	 *
	 * @return string
	 */
	public static function get_chunk_path( $id ) {
		$chunk_path = apply_filters( 'wpmdb_tranfers_chunk_folder', WP_CONTENT_DIR . DIRECTORY_SEPARATOR );

		return $chunk_path . ".{$id}-tmpchunk";
	}

	/**
	 *
	 * Creates a temporary file at file path specified by self::get_chunk_path() and chucks $chunk_data into said file to be transferred to the remote
	 *
	 * @param array $chunk_data
	 * @param int   $chunk_size
	 * @param array $state_data
	 *
	 * @return array
	 */
	public function create_chunk( $chunk_data, $chunk_size, $state_data ) {
		$file_path     = $chunk_data['file_path'];
		$stored_offset = $chunk_data['bytes_offset'];

		$chunk_path = self::get_chunk_path( $state_data['migration_state_id'] );

		$chunk_handle = fopen( $chunk_path, 'wb' );
		$file_handle  = fopen( $file_path, 'rb' );
		$file_size    = fstat($file_handle);

		if ( 0 !== $stored_offset ) {
			fseek( $file_handle, $stored_offset );
		}

        //Copying the stream directly prevents memory exhaustion
        stream_copy_to_stream($file_handle, $chunk_handle, $chunk_size);

		fclose( $chunk_handle );

		return [$chunk_path, $file_size['size']];
	}

	/**
	 * Checks if a file is too large to push
	 *
	 * @param array  $state_data
	 * @param int    $bottleneck
	 * @param string $file_path
	 * @param array  $file
	 * @param int    $chunks
	 *
	 * @return array|bool
	 */
	public function chunk_it( $state_data, $bottleneck, $file_path, $file, $chunks ) {
		$chunked = true;

		if ( 'pull' === $state_data['intent'] ) {
			return false;
		}

		//Check if we're currently chunking, existing chunk data stored as a option
		$chunk_option_name = 'wpmdb_file_chunk_' . $state_data['migration_state_id'];
		$chunk_option      = get_site_option( $chunk_option_name );

		// If we haven't sent a previous chunk
		if ( empty( $chunk_option ) ) {
			$chunk_data = $this->assemble_chunk_data( $chunked, $file, $file_path, $bottleneck, $chunks, 1 );
		} else {
			$chunk_data = $chunk_option;
		}

		// --- File chunking begins ---
		$chunked         = true;
		$file['chunked'] = true;

		// Actually creates the chunk of data and saves it to a `wp-content/.<ID>-tmpchunk` file
		list( $file_path, $file ) = $this->modify_file_data_for_chunk( $file, $chunk_data, $bottleneck, $state_data );

		// Get the size of the .<ID>-tmpchunk file in /wp-content
		$actual_chunk_size = filesize( $file_path );

		$chunk_data['bytes_offset'] += $actual_chunk_size;

		$file['bytes_offset'] = $chunk_data['bytes_offset'];
		$data = $this->assemble_chunk_data( $chunked, $file, $file_path, $actual_chunk_size, $chunks, $chunk_data['chunk_number'], $chunk_data['bytes_offset'] );

		// Update chunk number after chunk has been created
		$chunk_data['chunk_number'] ++;


		return [$data, $chunk_data];
	}

	/**
	 *
	 * Return a standard format array
	 *
	 * @param $chunked
	 * @param $file
	 * @param $file_path
	 *
	 * @return array
	 */
	public function assemble_chunk_data( $chunked, $file, $file_path, $chunk_size, $chunks, $chunk_number, $bytes_offset = 0 ) {
		$chunk_data = array(
			'chunked'      => $chunked,
			'file'         => $file,
			'file_path'    => $file_path,
			'chunk_size'   => $chunk_size,
			'chunks'       => $chunks,
			'chunk_number' => $chunk_number,
			'bytes_offset' => $bytes_offset
		);

		return $chunk_data;
	}

	/**
	 * @param $file
	 * @param $chunk_data
	 * @param $chunk_size
	 *
	 * @return array
	 */
	public function modify_file_data_for_chunk( $file, $chunk_data, $chunk_size, $state_data ) {
		list($file_path, $file_size) = $this->create_chunk( $chunk_data, $chunk_size, $state_data );
		$file['chunk_path']          = $file_path;
		$file['chunks']              = $chunk_data['chunks'];
		$file['chunk_number']        = $chunk_data['chunk_number'];
		$file['percent_transferred'] = round( ( $chunk_data['bytes_offset'] + filesize( $file_path ) ) / (int) $file_size,
            2 );
		$file['bytes_transferred']   = $chunk_size;

		return array( $file_path, $file );
	}
}
