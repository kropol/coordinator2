var DEBUGGLOBAL=false
//var DEBUGGLOBAL=true


// btoa == base64encode

//alert('browser started');// здесь не сработает, документ пока не готов
//window.addEventListener('load', function() { setInterval(alert("browser started"),3000); }, false);
//console.log('browser started')
var firstcall=0
//if(firstcall++>0)
var gettaskinterval//interval obj
var gettaskintervalperiod=2000//100500


if (!DEBUGGLOBAL) {
    window.addEventListener("load", function wload(event) {
        window.removeEventListener("load", wload, false); //remove listener, no longer needed
        gettaskinterval = setInterval(_gettask, gettaskintervalperiod)
    }, false);
}


//req()
//-----------------------------------------------------------------------------------------------------------------

tabs={
    atabs:[],
    create:function(name,url){
        var tabobj= gBrowser.addTab(url);
        var tabsThis=this;
        var timer=setTimeout(function(){
            gBrowser.removeTab(tabobj);
            for(var i in tabsThis.atabs){
                if(tabsThis.atabs[i].name==name){
                    tabsThis.atabs.splice(i,1);
                    break;
                }
            }
//            alert('atabs.length: '+tabsThis.atabs.length)
        },5*60*1000)
        var tab={name:name,
                tabobj:tabobj,
                timer:timer
        };
        return tab;
    },
    get:function(name,url){
        for(var i in this.atabs){
            if(this.atabs[i].name==name){
                gBrowser.selectTabAtIndex( this.atabs[i].tabobj._tPos)//при обращении вкладка будет активироваться для наглядности процесса
                return this.atabs[i];
            }
        }
        var tab=this.create(name,url);
        this.atabs.push(tab);
        gBrowser.selectTabAtIndex( tab.tabobj._tPos)//при обращении вкладка будет активироваться для наглядности процесса
        return tab;
    }
}

actions={
    ping:function(packet){
        packet.data=_encode('pong')
        _debug('ping method called')
        _debug(_isnull(packet)?'error packet is null':'packet is ok')
        packet.changedataandstate(packet.data,'done')
    },
    open:function(packet,callback){
         _debug('open method called')
         _debug(_isnull(packet)?'error packet is null':'packet is ok')
         _debug('packet.data: '+(_isnull(packet)?' ':_decode(packet.data)))

        try {
            tabs.get(packet.tab,"")
            gBrowser.getBrowserForTab(tabs.get(packet.tab).tabobj).contentDocument.location=_decode(packet.data)
            gBrowser.getBrowserForTab(tabs.get(packet.tab).tabobj).addEventListener("load", function load1(e) {
                var win = e.originalTarget.defaultView;
                var doc = e.originalTarget; // doc is document that triggered the event
                if (win != win.top) return; //only top window.
                if (_isnull(callback))packet.changestate('done')
                this.removeEventListener('load', load1, true)
//                gBrowser.getBrowserForTab(tabs.get(packet.tab).tabobj).removeEventListener('load', load1, true)//пусть пока побудет
                win.addEventListener('load', function load2() {
//                    alert('page load done')//это полная загрузка страницы по событию load от объекта window страницы
                    this.removeEventListener('load', load2, true)
//                    win.removeEventListener('load', load2, true)
                    if (!_isnull(callback))callback()
                }, true)
            }, true);
        } catch(e) {
            _debug("exception catched: "+e.message)
        }
    },
    src:function(packet){
        _debug('src method called')
        _debug(_isnull(packet)?'src: error packet is null':'src: packet is ok')
//        alert(packet.tostr())
        packet.data= _encode(gBrowser.getBrowserForTab(tabs.get(packet.tab).tabobj).contentDocument.body.parentNode.innerHTML)
        packet.changedataandstate(packet.data,'done')
    },
    srcsync:function(packet){
        actions.open(packet,function(){actions.src(packet);})
    },
    selector:function(packet){
        var result=''
//        console.log(gBrowser.getBrowserForTab(gBrowser.selectedTab).contentDocument.querySelector('#currencies').parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.innerHTML)
        var command=_decode(packet.data)
//        alert(command)
        try{
            command=command.replace(/document\./g,'gBrowser.getBrowserForTab(tabs.get(packet.tab).tabobj).contentDocument.')
            eval(command)
        }
        catch(e){
            result='expression -error- '+e.name
            console.log('exception occured in selector evaluation '+e.name)
            console.log('error selector: '+command)
        }
        packet.changedataandstate(_encode(result),'done')
        return result
    }
}

function _gettask(){
    var packet=new Packet('getjob','getjobtab')
    _debug('_gettask. request packet to be sent: '+packet.tostr())
    _xrequest('POST', packet,
        function(e) {
            _debug(_isnull(e.packet)?"_gettask.callback error e.packet is null":"_gettask.callback.e.packet ok")

            var actionsarray=_getMethods(actions,'arr')
            if (e.packet.action != 'error') {
                clearInterval(gettaskinterval)
                for(var i in actionsarray){
                    _debug('_gettask.current packet action: '+actionsarray[i])
                    if (actionsarray[i] == e.packet.action) {
                        _debug("_gettask.evaluating: " + 'actions.' + actionsarray[i] + '(e.packet)')
                        if (e.packet.action != 'error'){

                            try{eval('actions.' + actionsarray[i] + '(e.packet)');}
                            catch(m){console.log('exception occured in gettask. action=='+e.packet.action+' data='+_decode(e.packet.data))}
                        }
                        else _debug('e.packet.action==' + e.packet.action + ' so no method selected')
                        break;
                    }
                }
                if (!DEBUGGLOBAL) {
                    gettaskinterval = setInterval(_gettask, gettaskintervalperiod)
                }
            }
        }
    )
    _debug('_gettask finished')

}







function _xrequest(type,packet,callback){
    this.getXmlHttp = function getXmlHttp() {
        var xmlhttp;
        try {
            xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
            try {
                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (E) {
                xmlhttp = false;
            }
        }
        if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
            xmlhttp = new XMLHttpRequest();
        }
        return xmlhttp;
    }

    var address='http://localhost/_coordinator2/index.php'
    var _this=this
    this.packet=packet//todo data consistence not tested yet
    _debug('_xrequest.sending packet: '+packet.tostr())
    _debug('using '+type)
    if(type=='GET'){
        address+='?action='+packet.action+
                (!_isnull(packet.data) ?'&data='+packet.data:'')+
                (!_isnull(packet.id)   ?'&id='+packet.id:'')+
                (!_isnull(packet.state)?'&state='+packet.state:'');
    }

    var xmlhttp = this.getXmlHttp()
    xmlhttp.open(type, address, true);
    xmlhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
            if (xmlhttp.status == 200) {
                this.removeEventListener('load',arguments.callee,true)
                _debug('_xrequest: response:200 ok')
                _this.packet=new Packet(xmlhttp.responseText)
                _debug("xmlhttp.responseText:\n"+xmlhttp.responseText)
                
                _debug(_isnull(_this.packet)?'_xrequest creating packet error':('_xrequest got packet: '+(_this.packet.tostr())));
                _debug('_xrequest.callback present status: '+(_isnull(callback)?'error':'ok'))
                if(!_isnull(callback))callback(_this);
            }
        }
    };
    if(type=='GET'){
        _debug('sending get request')
        xmlhttp.send(null);
    }
    else{
        _debug('address='+address)
        _debug('sending post request '+JSON.stringify(packet))
        xmlhttp.send('packet='+JSON.stringify(packet));
    }




}








function Packet(action,tab,data,id,state){
    this.tostr=function(){
        return '\n\taction = '+this.action+'\n' +
               '\tdata   = '+((this.data.length>20)?this.data.substr(0,20):this.data)+'\n' +
               '\tid     = '+this.id+'\n' +
               '\tstate  = '+this.state+'\n' +
               '\ttab    = '+this.tab+'\n';
//        return '<span style="color: green;">'+this.action+'</span>' +
//               '<span style="color: black;">('+((this.data.length>20)?this.data.substr(0,20):this.data)+')[</span>' +
//               '<span style="color: blue;">'+this.id+'</span>' +
//               '<span style="color: red;">:'+this.state+'</span>]' +
//               '<span style="color: green;"> {'+this.tab+'</span>'+'}'
    }
    this.debug=function(){
        return this.action + '\n' +
            ((this.data.length > 20) ? this.data.substr(0, 20) : this.data) + '\n' +
            this.id + '\n' +
            this.state + '\n'
    }
    this.parsepage=function(page){
        _debug("Packet.parsepage:\n"+page)
        j=JSON.parse(page)
        var action = (_isnull(j.action) ? '' : j.action)
        var tab =    (_isnull(j.tab)    ? '' : j.tab)
        var data =   (_isnull(j.data)   ? '' : j.data)
        var id =     (_isnull(j.id)     ? '' : j.id)
        var state =  (_isnull(j.state)  ? '' : j.state)
        this.action=action//todo проверка по списку actions
        this.data=data
        this.id=id
        this.state=state
        this.tab=tab;
    }
    this.changestate=function(newstate){
        var packet=new Packet('updatestate','updatestate','',this.id,newstate)
        _debug('changestate. request packet to be sent: '+packet.tostr())
        var setnewstaterequest = new _xrequest('POST', packet,
            function(e) {
                _debug(_isnull(e.packet.state)?"changestate.callback error e.packet.state is null":"changestate.callback.e.packet.state ok")
                _debug("changestate.returned packet: "+e.packet.tostr())
            }
        )
        this.state=newstate;
        _debug('changestate finished')
    }
    this.changedata=function(newdata){
        _debug('changedata started')
        _debug(_isnull(newdata)?'error newdata is null':'newdata is ok')
        _debug(_isnull(id)?'error id is null':'id is ok')
        var packet=new Packet('updatedata','updatedatatab',newdata,this.id)
        _debug('changedata. request packet to be sent: '+packet.tostr())
        var setnewstaterequest = new _xrequest('POST', packet,
            function(e) {
                _debug(_isnull(e.packet.state)?"changedata.callback error e.packet.state is null":"changedata.callback.e.packet.state ok")
                _debug("changedata.returned packet: "+e.packet.tostr())
            }
        )
        _debug('changedata finished, xrequest sent')
    }
    this.changedataandstate=function(data,newstate){
        var packet=new Packet('updatedataandstate','updatedataandstatetab',data,this.id,newstate)
        _debug('changedataandstate. request packet to be sent: '+packet.tostr())
        var setnewstaterequest = new _xrequest('POST', packet,
            function(e) {
                _debug(_isnull(e.packet.state)?"changedataandstate.callback error e.packet.state is null":"changedataandstate.callback.e.packet.state ok")
                _debug("changedataandstate.returned packet: "+e.packet.tostr())
            }
        )
        _debug('changedataandstate finished')
    }

    
    if(action.length>20){
        this.parsepage(action)
    }else{
        this.action=(_isnull(action)?'error':action)//todo проверка по списку actions
        this.tab=(_isnull(tab)?'error':tab)
        this.data=  (_isnull(data)  ?''     :data  )
        this.id=    (_isnull(id)    ?''     :id    )
        this.state= (_isnull(state) ?''     :state )
    }

}







//function _eventmanager(){
////    this.joblistener=false
//    this.working=false
//    this.free=false
//    this.makeevents=function(){
//        if(!this.working){
//            this.working= new CustomEvent("working", {"detail":{"hazcheeseburger":true}});
////            obj.dispatchEvent(this.listener);
//            _debug('_eventmanager.working created status= '+((typeof this.working=='object')?'ok':'error'))
//        }
//        if(!this.free){
//            this.free= new CustomEvent("free", {"detail":{"hazcheeseburger":true}});
////            obj.dispatchEvent(this.listener);
//            _debug('_eventmanager.free created status= '+((typeof this.free=='object')?'ok':'error'))
//        }
//    }
//
//}
























function _isnull(my_var){
    if (typeof my_var !== "undefined" && my_var !== null  && my_var !== '') {
      return false
    }
    return true
}



var _myExt={
	getDoc:function(win) {
		if(win)
			return win.document;
		else if(content)
			return content.document;
		else
			return this.getBrowser().contentDocument;
	},
	getWindowMediator: function() {
		return Components.classes['@mozilla.org/appshell/window-mediator;1']
			.getService(Components.interfaces.nsIWindowMediator);
	},
	getBrowser: function() {
		try {
			return gBrowser;
		} catch(e) {
			// gBrowser is not available, so make use of the WindowMediator service instead:
			return this.getWindowMediator().getMostRecentWindow('navigator:browser').getBrowser();
		}
	},
    getElementsByClassName: function (classname, node) {
        if(!node) node = document.getElementsByTagName('body')[0];
        var a = [];
        var re = new RegExp('\\b' + classname + '\\b');
        var els = node.getElementsByTagName('*');
        for(var i=0,j=els.length; i<j; i++)
        if(re.test(els[i].className))a.push(els[i]);
        return a;
    }

}




function _HTMLParser(aHTMLString){
    var html = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html", null),
        body = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
    html.documentElement.appendChild(body);
    body.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
        .getService(Components.interfaces.nsIScriptableUnescapeHTML)
        .parseFragment(aHTMLString, false, null, body));
    return body;
}





















var _getAllKeys = function(obj,arr){
    if(_isnull(arr)){
        var keys = "";
        for(var key in obj){
          keys+=key+(typeof obj[key] == "function"?'()':'')+"<br>\n";
        }
        return keys;
    }else{
    var keys = [];
        for(var key in obj){
          keys.push(key+(typeof obj[key] == "function"?'()':''));
        }
        return keys;
    }
    

}

var _getMethods=function(obj,arr){
    if(_isnull(arr)){
        var methods = "";
            for (var m in obj) {
                if (typeof obj[m] == "function") {
                    methods+=(m)+"()\n";
                }
            }
        return methods;
    }else{
        var methods = [];
        for (var m in obj) {
            if (typeof obj[m] == "function") {
                methods.push(m);
            }
        }
        return methods;
    }
}

function req(){

    //for debugging
   // _gettask()
   alert('coordinator29')
    gBrowser.addEventListener("load", function load1(e) {
                var win = e.originalTarget.defaultView;
                var doc = e.originalTarget; // doc is document that triggered the event
                if (win != win.top) return; //only top window.
//                if (doc.nodeName != "#document") return; // only documents
//                if (win.frameElement) return; // skip iframes/frames
//                win.addEventListener('load', function load2() {
                    console.log('page load done')//это полная загрузка страницы по событию load от объекта window страницы
//                }, true)
            }, true);

//    console.log((gBrowser.selectedTab))
//    console.log(tabs.get('tabname','http://ws/').tabobj)
   // alert('DEBUGGLOBAL: '+DEBUGGLOBAL)


//    return;

////    BETTER WAY
//    var newTabBrowser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
//    newTabBrowser.addEventListener("load",
//        function (e) {
//            var win=e.originalTarget.defaultView;
//            var doc = e.originalTarget; // doc is document that triggered the event
//            if (win != win.top) return; //only top window.
//
//            if(firstcall++>0){// первым делом загружается событие для about:blank при старте браузера. так мы обходим этот косяк
//                gettaskinterval=setInterval(_gettask,gettaskintervalperiod)
//                console.log("page was fully loaded: "+doc.location.href);
//                this.removeEventListener('load',arguments.callee,true)
////                newTabBrowser.contentDocument.body.innerHTML +="page was fully loaded: "+doc.location.href+'<br>';
////                alert(newTabBrowser.contentDocument.innerHTML)
//            }
//        }
//    , true);

//    var trans=new _transport()
//    var eventmanager=new _eventmanager()
//    eventmanager.makeevents()
}



function _debug(str){
    if (!DEBUGGLOBAL)return;
    console.log(str);
}

function l2a(){
    var arr=Array(this.length)
    for(var i=0;i<this.length;arr[i]=this[i++]){}
    return arr
}

function _encode(str){
    try {
        while (str.indexOf(' ') != -1)str = str.replace(' ', '^^!^^!^^')
        return btoa(encodeURIComponent(str))
    } catch(e) {
        return str;
    }
}
function _decode(str){
    try {
        str = decodeURIComponent(atob(str))
        while (str.indexOf('^^!^^!^^') != -1)str = str.replace('^^!^^!^^', ' ')
        return str
    } catch(e) {
        return str;
    }
}