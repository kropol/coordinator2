<?php
//echo 'hello!!!';
define('DEBUGGLOBAL',false);
//define('DEBUGGLOBAL',true);

class actions{
    public static $list;// array of actions заполняется в координаторе
    public static $error='error';
}

class states{
    public static $new='new';
    public static $processing='processing';
    public static $done='done';
    public static $error='error';
    public static $save='save';
}

class packet{
    public $action;
    public $data;
    public $state;
    public $id;
    public $tab;
    function __construct($action,$tab,$data='',$state='',$id=''){
//        _debug(func_get_args());
        $this->setaction($action);
        $this->setdata($data);
        $this->setstate($state);
        $this->setid($id);
        $this->settab($tab);
    }
    public function setaction($action){
        $actions = actions::$list; //get_class_vars(actions);
//        _debug($actions);
        foreach ($actions as $name) {
            if ($name == $action) {
                $this->action = $name;
                return;
            }
        }
        $this->action = 'error';
    }
    public function setstate($newstate){
        $states = get_class_vars('states');
        foreach ($states as $name => $value) {
            if ($name == $newstate) {
                $this->state = $newstate;
                return;
            }
        }
        $this->state = 'error';
    }
    public function setdata($newdata){
        $this->data=$newdata;
    }
    public function setid($id){
        $this->id=$id;
    }
    public function settab($tab){
        if(!isset($tab) || empty($tab)){
            $this->setaction("");
            $this->setdata("error! no tab id given");
            $this->tab='none';
        }
        $this->tab=$tab;
    }

    function __toString()
    {
        return json_encode(get_object_vars($this));
    }
}

class db{//gets host login pass in constuctor
    private $session;
    function __construct($host,$login,$pass){
        $this->session=mysql_connect($host, $login, $pass) or die(mysql_error());
        _debug('connected ok');
        $ret=mysql_select_db('coordinator2',$this->session) or $this->createdbandtable();
        _debug('db selection status: '.($ret?'ok':'error'));
    }
    function __destruct(){
        @mysql_close($this->session);
    }
    public function insert(packet $packet){
        _debug('db->insertion started');
        $retvalue=mysql_query("insert into tasks (action, data, state, tab) values ('".
                              $packet->action."','".
                              $packet->data."','".
                              $packet->state."','".
                              $packet->tab."')",
                              $this->session) or die(mysql_error());
        _debug('db->insert query status: '.($retvalue?'ok':'error').'');
        $packet->id=mysql_insert_id($this->session);
        return $retvalue?true:false;
    }
    public function findid($id){
        _debug('db->findid started');
        $retvalue=mysql_query('select * from tasks where id like '.$id,$this->session) or die(mysql_error());
        _debug('db->findid done status '.($retvalue?'ok':'error').'');
        if(is_bool($retvalue) || mysql_affected_rows($this->session)==0)return new packet('error','none','db:nodatafound','error',false);
        else{
            $arr=mysql_fetch_assoc($retvalue);
            return new packet($arr['action'],$arr['tab'],$arr['data'],$arr['state'],$arr['id']);
        }
    }
    public function findstate($state){
        _debug('db->findstate *'.$state.'* started');
        $retvalue=mysql_query("select * from tasks where state like '".$state."' order by id limit 1",$this->session) or die('ошибка при запросе findstate');
        _debug('db->findstate done status '.($retvalue?'ok':'error').'');
        if(is_bool($retvalue) || mysql_affected_rows($this->session)==0)return new packet('error','none','db:nodatafound','error',false);
        else{
            $arr=mysql_fetch_assoc($retvalue);
            return new packet($arr['action'],$arr['tab'],$arr['data'],$arr['state'],$arr['id']);
        }
    }
    public function findstored($state){// в state хранится категория информации // еще не тестировано
        _debug('db->findstored *'.$state.'* started');
        $retvalue=mysql_query("select * from tasks where action like 'store' and state like '".$state."' order by id",$this->session) or die('ошибка при запросе findstored');
        _debug('db->findstored done status '.($retvalue?'ok':'error').'');
        if(is_bool($retvalue) || mysql_affected_rows($this->session)==0)return new packet('error','none','db:nodatafound','error',false);
        else{
            $returnreadyfetchedfullarray=array();
            while($x=mysql_fetch_assoc($retvalue))
                $returnreadyfetchedfullarray[]=$x;// json? serialized string?
//            return $returnreadyfetchedfullarray;
            
            $arr=mysql_fetch_assoc($retvalue);
            return new packet($arr['action'],$arr['tab'],$arr['data'],$arr['state'],$arr['id']);
        }
    }
    public function updatestate($packet){
        _debug('db->updatestate started');
        $retvalue=mysql_query("update tasks set state='".$packet->state."' where id=".$packet->id,$this->session) or die(mysql_error());
        if(is_bool($retvalue) || mysql_affected_rows($this->session)==0)_debug('db->updatestate done status: '.($retvalue?'ok':'error').'');
        return $retvalue?true:false;
    }
    public function updatedata($packet){
        _debug('db->updatedata started');
        $retvalue=mysql_query("update tasks set data='".$packet->data."' where id=".$packet->id,$this->session) or die(mysql_error());
        if(is_bool($retvalue) || mysql_affected_rows($this->session)==0)_debug('db->updatedata done status: '.($retvalue?'ok':'error').'');
        return $retvalue?true:false;
    }
    public function createdbandtable(){
        _debug('db deleting started');
        $retvalue=mysql_query('drop database if exists coordinator2',$this->session) or die(mysql_error());
        _debug('db drop status: '.($retvalue?'ok':'error').'');

        _debug('db creation started');
        $retvalue=mysql_query('create database coordinator2',$this->session) or die(mysql_error());
        _debug('db creation status: '.($retvalue?'ok':'error').'');

        $ret=mysql_select_db('coordinator2',$this->session);
        _debug('db selection status: '.($ret?'ok':'error').'');
        
        $retvalue=mysql_query("
                create table tasks (
                action varchar(20) NOT NULL default '',
                   tab varchar(20) NOT NULL default '',
                         data text NOT NULL default '',
                 state varchar(10) NOT NULL default '',
                        id int(11) NOT NULL auto_increment,
                 PRIMARY KEY (id)
            ) charset utf8 COLLATE utf8_general_ci",$this->session) or die(mysql_error());
        _debug('table creation status: '.($retvalue?'ok':'error').'');
    }
}

class page{
    private $sendcalled;
    function __construct(){
        $this->sendcalled=false;
    }
    function __destruct(){
        if($this->sendcalled)echo '
            </body>
        </html>';
    }
    private function pagecaption(){
        echo '<html>
            <head>
                <meta http-equiv="content-type" content="text/html; charset=utf-8" />
            </head>
            <body>';
    }
    public function printsource($packet){
        echo _decode($packet->data);
    }
    public function createelement($tag,$attribs,$innerhtml){
        return '<'.$tag.' '.$attribs.'>'.$innerhtml.'</'.$tag.'>';
    }
    public function send(packet $packet,$decoded=false){
        if($decoded){
            echo $packet;
            return;
        }
        $this->pagecaption();
        $this->sendcalled=true;

        $packet->data=($decoded?$packet->data:_decode($packet->data));
        echo "<pre>";
        print_r(json_decode((string)$packet));
        echo "</pre>";
        $this->button('mainpage','mainpage','');
        $this->button('done','none','updatestate&state=done&id='.$packet->id.'&tab=test');
        $this->button('processing','none','updatestate&state=processing&id='.$packet->id.'&tab=test');
        $this->button('refreshPacket','refreshPacket','refreshpacket&id='.$packet->id.'&tab=test');
        $this->button('srcsync','srcsync','ifdonereturnsrc&id='.$packet->id.'&tab=test');
        
    }
    public function button($name,$id,$urlfunc,$inline=0,$returntext=0){
        $txt='<a id="'.$id.'" href="'.$_SERVER['PHP_SELF'].'?action='.$urlfunc.'">'.$name.'</a>'.($inline?'':'<br>');
        if($returntext)return $txt; else echo $txt;
    }
}
class coordinator{
    private $page;
    private $db;
    private $packet;
    function __construct(){
        $this->createactionslist();//exit;
        $this->page=new page();
        $this->db=new db('localhost','root','');
        $this->packet=new packet('','');//это для того, чтобы шторм сразу прохавал долбаный тип объекта
        $this->createinputpacket();
        
        $evalme="\$this->".$this->packet->action.'();';
        _debug('evalme=='.$evalme.'');
        if($this->packet->action!=actions::$error){
            eval($evalme);}
        else{
            _debug('error calling initial packet action (action==error)');}

    }
    function createinputpacket(){
        $action='';
        $tab='';
        $data='';
        $state='new';
        $id='';
        _debug('_SERVER["REQUEST_METHOD"]='.$_SERVER["REQUEST_METHOD"]);

        if($_SERVER["REQUEST_METHOD"]=="GET"){
            _debug('parsing GET');
            _debug($_GET);
            if(array_key_exists('action',$_GET))$action=$_GET['action'];
            if(array_key_exists('tab',$_GET))$tab=$_GET['tab'];
            if(array_key_exists('data',$_GET))$data=$_GET['data'];
            if(array_key_exists('state',$_GET))$state=$_GET['state'];
            if(array_key_exists('id',$_GET))$id=($_GET['id']==''?'':$_GET['id']*1);
        }
        else if($_SERVER["REQUEST_METHOD"]=="POST"){
            _debug('parsing POST');//для получения постзапросов нужно обращаться не к папке, а к php файлу напрямую!!!!
//            file_put_contents(dirname(__FILE__).'/debug.html',print_r($_POST,true),FILE_APPEND);
            _debug($_POST);
            $json='';
            if(array_key_exists('packet',$_REQUEST))$json=json_decode($_REQUEST['packet']);
            _debug("got json:");
            _debug($json);
            if(!empty($json->action))$action=$json->action;
            if(!empty($json->tab))$tab=$json->tab;
            if(!empty($json->data))$data=$json->data;
            if(!empty($json->state))$state=$json->state;
            if(!empty($json->id))$id=$json->id*1;
        }


        $this->packet=new packet($action,$tab,$data,$state,$id);
//        if(DEBUGGLOBAL)$this->page->send($this->packet);
        if($this->packet->action==actions::$error){
           _debug('error packet created');
            $this->page->button('ping','ping','ping&tab=test');
            $this->page->button('getjob','getjob','getjob&tab=test');
            $this->page->button('getjob (human)','getjobHuman','getjobHuman&tab=test');
            $this->page->button('open ya.ru','open','open&data='._str2Hex('http://ya.ru').'&tab=test');
            $this->page->button('open main','open','open&data='._str2Hex('http://localhost/_coordinator').'&tab=test');
            $this->page->button('open rozetka','open','open&data='._str2Hex('http://rozetka.com.ua/').'&tab=test');
            $this->page->button('src','src','src&tab=test');
            $this->page->button('srcsyncya','srcsync','srcsync&data='._str2Hex('http://ya.ru').'&tab=test');
            $this->page->button('srcsyncmn','srcsync','srcsync&data='._str2Hex('http://localhost/_coordinator').'&tab=test');
            $this->page->button('srcsyncrz','srcsync','srcsync&data='._str2Hex('http://rozetka.com.ua/').'&tab=test');
        }
        _debug('coordinator->packet creation status: '.($this->packet->action!=actions::$error?'ok':'error'));
        _debug($this->packet);
    }
    private function createactionslist(){
        $meths=get_class_methods('coordinator');
//        _debug($meths);
        $meths=array_filter($meths,function($i){return strstr($i,'__construct')||strstr($i,'createinputpacket')||strstr($i,'createactionslist')?false:true;});
//        _debug($meths);
        actions::$list=$meths;
    }
    public function ping(){
        $this->db->insert($this->packet);
        $this->page->send($this->packet,true);
    }
    public function getjob(){
        $this->packet=$this->db->findstate('new');
        $this->page->send($this->packet,true);
    }
    public function getjobHuman(){
        $this->packet=$this->db->findstate('new');
        $this->page->send($this->packet);
    }
    public function updatestate($transit=0){
        $result=false;
        _debug('starting coordinator->updatestate execution');
        _debug((is_int($this->packet->id)?'packet->id is int':'packet->id is   NOT!!!    int ('.$this->packet->id.')'));
        if(is_int($this->packet->id))$result=$this->db->updatestate($this->packet);
        _debug('coordinator->updatestate execution status: '.($result?'ok':'error'));
        if($transit==0)$this->page->send($this->packet,true);
    }
    public function updatedata($transit=0){
        $result=false;
        _debug('starting coordinator->updatedata execution');
        _debug((is_int($this->packet->id)?'packet->id is int':'packet->id is   NOT!!!    int ('.$this->packet->id.')'));
        if(is_int($this->packet->id))$result=$this->db->updatedata($this->packet);
        _debug('coordinator->updatedata execution status: '.($result?'ok':'error'));
        if($transit==0)$this->page->send($this->packet,true);
    }
    public function updatedataandstate(){
        _debug('starting coordinator->updatedataandstate execution');
        $this->updatedata(1);
        $this->updatestate(1);
        $this->page->send($this->packet,true);
    }
    public function open(){
        _debug('starting coordinator->open execution');
        $this->packet->data=_encode(_hex2str($this->packet->data));
        if($this->packet->data==''||strlen($this->packet->data)<3)_debug('starting coordinator->open data length error');
        $this->db->insert($this->packet);
        $this->page->send($this->packet,true);
    }
    public function opens(){// synchronous method
        _debug('starting coordinator->opens execution');
        $this->packet->action='open';
        $this->packet->data=_encode(_hex2str($this->packet->data));
        if($this->packet->data==''||strlen($this->packet->data)<3)_debug('starting coordinator->opens data length error');
        $this->db->insert($this->packet);
        while($this->packet->state!=states::$done){
            sleep(1/3);
            $this->packet=$this->db->findid($this->packet->id);
        }
        $this->page->printsource($this->packet);
    }
    public function src(){
        _debug('starting coordinator->src execution');
        $this->db->insert($this->packet);
        $this->page->send($this->packet,true);
    }
    public function srcsync(){//в data получаем заэнкоженную урлу страницы и синхронно имеем ее исходник
        _debug('starting coordinator->srcsync execution');
        $this->packet->data=_encode(_hex2str($this->packet->data));
        $this->db->insert($this->packet);
        while($this->packet->state!=states::$done){
            sleep(1/3);
            $this->packet=$this->db->findid($this->packet->id);
        }
        $this->page->printsource($this->packet);
    }
    public function refreshpacket(){
        _debug('starting coordinator->refreshpacket execution');
        $this->packet=$this->db->findid($this->packet->id);
        $this->page->send($this->packet,true);
    }

    public function ifdonereturnsrc()
    {
        $this->packet = $this->db->findid($this->packet->id);
        if (is_int($this->packet->id * 1) && $this->packet->state == states::$done && ($this->packet->action == 'src' || $this->packet->action == 'srcsync')) $this->page->printsource($this->packet);
        else {
            $this->page->send($this->packet);
            echo "id is int: " . (is_int($this->packet->id * 1) ? 1 : 0) . "<br>";
            echo "state: " . ($this->packet->state == states::$done ? 1 : 0) . "<br>";
            echo "action: " . (($this->packet->action == 'src' || $this->packet->action == 'srcsync') ? 1 : 0) . "<br>";
            echo "summary: " . (is_int($this->packet->id * 1) && $this->packet->state == states::$done && ($this->packet->action == 'src' || $this->packet->action == 'srcsync')
                    ? 1 : 0) . "<br>";
        }
    }
    public function selector()//sync method
    {
        $this->packet->data=_encode(_hex2str($this->packet->data));
        $this->db->insert($this->packet);
        while($this->packet->state!=states::$done){
            sleep(1/3);
            $this->packet=$this->db->findid($this->packet->id);
        }
        $this->page->printsource($this->packet);
    }
}

function _debug($str){
    if(!DEBUGGLOBAL)return;
    if(is_array($str) || is_object($str)){
        echo "<pre>";
        print_r($str);
        echo "</pre>";
    }
    else{
        $color=(strstr($str,'error')?'red':(strstr($str,' ok')?'green':'black'));
        echo '<p style="color: '.$color.';">';
        echo $str;
        echo '</p>';
    }
}

function _hex2str($hex) {
    $str='';
    for($i=0;$i<strlen($hex);$i+=2)
       $str .= chr(hexdec(substr($hex,$i,2)));

    return $str;
}
function _str2Hex($string){
    $hex='';
    for ($i=0; $i < strlen($string); $i++){
        $hex .= dechex(ord($string[$i]));
    }
    return $hex;
}

function _encode($s){// да, здесь все равно проблема с пробелами, только в данном случае при передаче страницы символы + автоматически преобразовывались в них
    return str_replace('+','^^!^^!^^',base64_encode($s));// так что лечим опять заменами
}
function _decode($s){
    return base64_decode(str_replace('^^!^^!^^','+',$s));
}

new coordinator();

?>