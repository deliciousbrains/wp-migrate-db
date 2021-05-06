<?php


namespace DeliciousBrains\WPMDB\Common;


use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\WPMDBDI;

class Helpers
{
    public static function getFormData(){
        return WPMDBDI::getInstance()->get(FormData::class)->getFormData();
    }
}
