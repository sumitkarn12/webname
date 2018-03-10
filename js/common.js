Parse.initialize( "1e3bc14f-0975-4cb6-9872-bff78542f22b" );
Parse.serverURL = "https://parse.buddy.com/parse";

// if( Parse.User.current() != null ) { Parse.User.current().fetch(); }
fetch("/gradients.json").then(res=>res.json()).then(json=>{
	let index = Math.floor(Math.random()*json.length);
	$(".bg").css({ "background": `linear-gradient( -45deg, ${json[index].colors.join(",")})` });
});
try {
	jconfirm.defaults = {
		typeAnimated: true,
		useBootstrap: false,
		bgOpacity: 0.8,
		backgroundDismiss: true,
		animation: "scaleY"
	}
} catch(e){}
function changeTheme( th ) {
	$( "#app-theme-link" ).attr("href", th);
}
$.fn.serializeObject = function() {
	var o = {};
	var a = this.serializeArray();
	$.each(a, function() {
		if (o[this.name]) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	return o;
};
const Mdl = Backbone.View.extend({
	el: ".spinner-wrapper",
	initialize: function() {
		this.$el.on("animationend", ( ev )=> {
			if($( ev.target ).hasClass('spinner-wrapper')) {
				this.$el.removeClass('spinner-wrapper-hide')
				this.$el.hide()
			}
		});
	},
	render: function( o ) {
		o = $.extend({ type: "spinner", body: "", timeout: 60*60*1000 }, o);
		this.$el.find(".type").hide();
		this.$el.find(".msg").html( o.body );
		this.tym = setTimeout( ()=> this.hide(), o.timeout );
		this.$el.find("."+o.type).show();
		this.$el.show();
	},
	hide: function() {
		clearTimeout( this.tym );
		this.$el.addClass('spinner-wrapper-hide');
	}
});
var mdl = new Mdl();
function lazyLoad( url ) {
	return new Promise(( resolve ) => {
		let img = new Image();
		img.onload = ( imgEvent ) => {
			resolve( imgEvent.path[0] );
		};
		img.src = url
	});
}
