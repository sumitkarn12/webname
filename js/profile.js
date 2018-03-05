
const Model = Backbone.Model.extend();
let model = new Model();
const Profile = Backbone.View.extend({
	el: "#profile",
	sendUrl : "http://www.facebook.com/dialog/send?app_id=1778142652491392&link={href}&redirect_uri={href}",
	fbShareUrl : "https://www.facebook.com/dialog/share?app_id=1778142652491392&display=page&href={href}&redirect_uri={href}",
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
		$("#shares .fb-share").attr("href", this.fbShareUrl.replace( /{href}/g, encodeURIComponent( location.href ) ) );
		$("#shares .send").attr("href", this.sendUrl.replace( /{href}/g, encodeURIComponent( location.href ) ) );
		$("#shares .tweet").attr("href", this.tweetUrl.replace(/{text}/g, encodeURIComponent(`${location.href} | My new web address`)));
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
	renderBookmark: function( dummy ) {
		dummy = $.extend({ image_url: "https://webname.ga/icos/cover.png", title: dummy.short_page_url, description: dummy.page_url }, dummy);
		let self = this;
		let tmpl = $(self.template( dummy ));
		self.$el.find(".links").append( tmpl );
		let img = new Image();
		img.onload = function( ev ) {
			let wd = ev.target.width;
			let ht = ev.target.height;
			if( wd <= ht ) {
				tmpl.find(".card").css("display", "flex");
			}
		}
		img.src = dummy.image_url
	},
	render: function( links ) {
		let self = this;
		if( links && links.length > 0 ) {
			this.$el.find(".links").empty();
			links.forEach(( e )=>{
				let dummy = { "title":"", "description":"", "short_page_url":"", "type":"", "videoTag":"", "favicon":"", "site_name":"", "image_url":"https://webname.ga/icons/cover.png", "page_url":"" }
				dummy = $.extend( dummy, e );
				if( dummy.short_page_url == "" ) dummy.short_page_url = dummy.page_url;
				try { self.renderBookmark( dummy ); } catch(e){}
			});
		}
	}
});
const OtherLinks = Bookmark.extend({
	el: "#otherlinks",
	Model: Parse.Object.extend("LINKS"),
	collection: [],
	skip: 0,
	limit: 6,
	initialize: function() {
		let self = this;
		this.template = _.template( this.$el.find("#template").html() );
		model.on("change:objectId", () => {
			this.skip = 0;
			this.$el.find(".links").empty();
			this.render();
		});
		let io = new IntersectionObserver( entries => {
			if( entries.filter( en => en.target.id == "load-next" )[0].isIntersecting ) {
				self.render();
			}
		});
		io.observe( this.$el.find("#load-next")[0] );
		return this;
	},
	render: function() {
		let self = this;
		if( this.skip < 0 || !model.get("objectId") ) return this;
		let parseQuery = new Parse.Query( this.Model );
		parseQuery.equalTo( "createdBy", model.get("objectId") );
		parseQuery.limit( this.limit );
		parseQuery.skip( this.skip );
		parseQuery.descending("createdAt");
		parseQuery.find(results => {
			results.forEach(result=>{
				self.collection.push( result );
				self.renderBookmark( result.toJSON() );
			});
			self.skip = self.skip+self.limit;
			if( results.length == 0 ) self.skip = -1;
		});
		return this;
	}
});

let profile = new Profile();
let quickie = new Quickie();
let bookmark = new Bookmark();
let otherlinks = new OtherLinks();

mdl.render({body: "Painting with some colors to make it beautiful 😋", timeout: 10*60*1000});
let path = location.pathname.replace(/\//g,"");
let q = new Parse.Query( Parse.User );
q.equalTo( "username", path );
q.first().then(( u )=>{
	if( u == null ) {
		mdl.render({
			type: "error",
			body: "Sorry to say, but we couldn't find this person. <br/><br/>However you can also create your own by clicking <a href='/create'><b>here</b></a>"
		});
	} else {
		model.set( "image", u.get( "image" ) );
		model.set( "profile", u.get( "profile" ) );
		model.set( "objectId", u.id );
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
