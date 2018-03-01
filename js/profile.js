
Parse.initialize( "1e3bc14f-0975-4cb6-9872-bff78542f22b" );
Parse.serverURL = "https://parse.buddy.com/parse";

fetch("/gradients.json").then(res=>res.json()).then(json=>{
	let index = Math.floor(Math.random()*json.length);
	let colors = json[index].colors;
	$(".bg").css({
		"background": `linear-gradient( ${colors[0]}, ${colors[colors.length-1]})`,
		"background-attachment": `fixed`
	});
});
const Model = Backbone.Model.extend();
let model = new Model();
const Profile = Backbone.View.extend({
	el: "#profile",
	fbShareUrl : "https://www.facebook.com/dialog/share?app_id=145634995501895&display=popup&href={href}",
	tweetUrl : "https://twitter.com/intent/tweet?text={text}",
	initialize: function() {
		model.on("change:profile", ( m,v ) => this.renderProfile( v ) );
		model.on("change:image", (m,v)=>this.renderDP( v ) );
		$("#shares #copy").submit(e=>{
			e.preventDefault();
			$(e.currentTarget).find("input").select();
			let fa = document.execCommand( "copy" );
			if( fa )
				mdl.render({ type: "success", body: "Copied", timeout: 2000 });
			else
				mdl.render({ type: "error", body: "Something went wrong", timeout: 2000 });
		});
	},
	renderDP: function( image ) {
		let u = null;
		if( image.type == "file" ) {
			u = image.data.url();
		} else {
			u = image.data;
		}
		this.$el.find(".cover").css( "background-image", `url(${u})` );
		this.$el.find(".dp").attr( "src", u );
		$("link[rel]").each((i,m)=> {
			if(m.rel.search("icon") != -1) {
				m.href = u
			}
		});
		$("meta[property]").each((i,m)=> {
			if($(m).attr("property").search("image") != -1) {
				m.content = u
			}
		});
	},
	updateMeta: function( profile ) {
		$("meta").each((i,m)=>{
			let n = $(m).attr("property") || $(m).attr("name");
			switch( n ) {
				case "og:description": 
				case "description": m.content = profile.about; break;
				case "application-name":
				case "og:title": m.content = profile.name+" | My presence on web"; break;
				case "og:url":
				case "og:site_name": m.content = location.href; break;
				case "og:type": m.content = "profile"; break;
			}
		});
		$("title").html( profile.name+" | My presence on web" );
	},
	renderProfile: function( profile ) {
		this.$el.find(".name").html( profile.name );
		this.$el.find(".about").html( profile.about );
		if( profile.mobile ) {
			this.$el.find(".call").attr( "href", `tel:${profile.mobile}` );
			this.$el.find(".call").show();
		}
		if( profile.email ) {
			this.$el.find(".email").attr( "href", `mailto:${profile.email}` );
			this.$el.find(".email").show();
		}
		this.updateMeta( profile );
		$("#shares #copy input").val(location.href);
		$("#shares .fb-share").attr("href", this.fbShareUrl.replace("{href}", location.href) );
		$("#shares .tweet").attr("href", this.tweetUrl.replace("{text}", `I found this webname. ${location.href}`));
	}
});
const Quickie = Backbone.View.extend({
	el: "#quickie",
	initialize: function() {	
		model.on("change:favbtns", (m,v)=> this.render( v ) )
		this.template = _.template( this.$el.find("#template").html() );
	},
	render: function( links ) {
		let self = this;
		this.$el.find(".btns").empty();
		links.forEach(( e )=>{
			if( e.url == null ) e = $.extend(e, { url: self.toUrl( e ) });
			else e.url = e.short_url;
			self.$el.find(".btns").append( self.template( e ) );
		});
	},
	toUrl: function( o ) {
		switch( o.type ) {
			case "facebook" : return `https://www.facebook.com/${o.uid}`;
			case "twitter" : return `https://www.twitter.com/${o.uid}`;
			case "instagram" : return `https://www.instagram.com/_u/${o.uid}`;
			case "facebook-messenger" : return `https://m.me/${o.uid}`;
			case "youtube" : return `https://www.youtube.com/${o.uid}`;
			case "google-plus" : return `https://plus.google.com/+${o.uid}`;
			case "linkedin" : return `https://www.linkedin.com/in/${o.uid}`;
			case "github" : return `https://www.github.com/${o.uid}`;
			case "whatsapp" : return `https://api.whatsapp.com/send?phone=${o.uid}&text=${encodeURIComponent("Sending hi from "+location.href)}`;
			default: return o.uid;
		}
	}
});
const Bookmark = Backbone.View.extend({
	el: "#bookmark",
	initialize: function() {	
		model.on("change:bookmarks", (m,v)=> this.render( v ) )
		this.template = _.template( this.$el.find("#template").html() );
	},
	render: function( links ) {
		console.log( links );
		let self = this;
		if( links && links.length > 0 ) {
			this.$el.find(".links").empty();
			links.forEach(( e )=>{
				let dummy = { "title":"", "description":"", "short_page_url":"", "type":"", "videoTag":"", "favicon":"", "site_name":"", "image_url":"https://webname.ga/icons/cover.png", "page_url":"" }
				dummy = $.extend( dummy, e );
				if( dummy.short_page_url == "" ) dummy.short_page_url = dummy.page_url;
				try {
					let tmpl = $(self.template( dummy ));
					self.$el.find(".links").append( tmpl );
				} catch ( e ) {
					console.log( e );
				}
			});
		}
	}
});
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
		this.$el.show();
		this.$el.find("."+o.type).show();
	},
	hide: function() {
		clearTimeout( this.tym );
		this.$el.addClass('spinner-wrapper-hide');
	}
});

let profile = new Profile();
let quickie = new Quickie();
let bookmark = new Bookmark();
var mdl = new Mdl();

mdl.render({body: "Smile! Your're going to see a magic", timeout: 10*60*1000});
let path = location.pathname.replace(/\//g,"");
let q = new Parse.Query( Parse.User );
q.equalTo( "username", path );
q.first().then(( u )=>{
	console.log( u );
	if( u == null ) {
		mdl.render({
			type: "error",
			body: "The user you are looking for, could not be found. Please recheck link given to you.<br/>However you can create your own by clicking <a href='/create'>here</a>"
		});
	} else {
		model.set( "image", u.get( "image" ) );
		model.set( "profile", u.get( "profile" ) );
		model.set( "favbtns", u.get( "favbtns" ) );
		model.set( "bookmarks", u.get( "links" ) );
		$("#app-theme-link").attr("href", u.get("theme"))
		mdl.hide();
		if( Parse.User.current() == null ) {
			$(".edit-profile").text( "Create your profile" );
		} else {
			$(".edit-profile").text( `Hey ${Parse.User.current().get("profile").name}, Update your profile` );
		}
	}
}, console.error );

$( window ).on('resize', function(event) {
	event.preventDefault();
	let w = bookmark.$el.find(".link .w3-card").first().width();
	bookmark.$el.find(".link .faded-background").height( w );
});