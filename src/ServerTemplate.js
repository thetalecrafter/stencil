/*!
 * Stencil ServerTemplate v0.1
 *  Connect provider for Stencil Templates
 * Copyright(c) 2010 Andy VanWagoner
 * MIT Licensed
 **/

	// imports, constants, and shortcuts
var Template = require('./Template').Template,
	fs       = require('fs'),
	sys      = require('sys'),
	Path     = require('path'),

	DEFAULT_PATH = '/index.html',

	MT = '', UTF8 = 'utf-8', COMPLETE = 'complete', ERROR = 'error',
	join = Array.prototype.join, slice = Array.prototype.slice;


/**
 * ServerTemplate constructor
 *  Sets up template properties,
 *  and connects to the request and response objects
 * @constructor
 * @extends Template
 * @version 0.1
 * @param {Object} o A hash of the settings to override
 * @return this
 * @type ServerTemplate
 **/
function ServerTemplate(o) {
	Template.apply(this, arguments);

	o = o || {}; // must be an object
	this.path     = o.path     || this.path;
	this.stat     = o.stat     || this.stat;
	this.request  = o.request  || this.request;
	this.response = o.response || this.response;

	return this;
}


/**
 * ServerTemplate prototype
 *  Sets up defaults for properties and attaches public methods
 *  Defaults can be changed by updating the prototype
 **/
ServerTemplate.prototype          = new Template();
/** The path to the template file input */
ServerTemplate.prototype.path     = DEFAULT_PATH;
/** The stat object populated when the template file is loaded */
ServerTemplate.prototype.stat     = null;
/** The http request asking for this template */
ServerTemplate.prototype.request  = null;
/** The http response the template will output to */
ServerTemplate.prototype.response = null;


/**
 * Turn input into executable JavaScript
 * @methodOf ServerTemplate.prototype
 * @param {Boolean} use_cached If true, prevents the template from recompiling
 * @param {Function} next Called when the code is ready to execute
 * @return this (the new code is in this.compiled)
 * @type ServerTemplate
 **/
function compile(use_cached, next) {
	// already compiled
	if (use_cached && this.compiled) {
		if (next) { next.call(this); }
		return this;
	}

	// already has template input
	if (this.input) {
		Template.prototype.compile.call(t);
		if (next) { next.call(this); }
		return this;
	}

	// read input from file
	var template = this,
		file = Path.join(ServerTemplate.root, this.path.replace(/\.\.+/g, '.'));

	fs.stat(file, function(err, stat) {
		if (err) { template.dispatchEvent(ERROR, err); return; }

		template.stat = stat;
		fs.readFile(file, UTF8, function(err, input) {
			if (err) { template.dispatchEvent(ERROR, err); return; }

			// save input from file and compile
			template.input = input;
			Template.prototype.compile.call(template);
			if (next) { next.call(template); }
		});
	});

	return this;
}
ServerTemplate.prototype.compile = compile;


/**
 * Process the template given a data context
 * @methodOf ServerTemplate.prototype
 * @param {Object} data The data context for the template
 *  data will be in scope in the template
 * @return this
 * @type ServerTemplate
 **/
function exec(data) {
	data = data || {}; // must be an object
	this.compile(true, function() {
		// process result
		this.dispatchEvent('exec');
		return this.compiled.call(this, data);
	});
	return this;
}
ServerTemplate.prototype.exec = exec;


/**
 * Appends all the arguments to the template output
 * @methodOf ServerTemplate.prototype
 * @return this
 * @type ServerTemplate
 **/
function echo() {
	this.response.write(join.call(arguments, MT), UTF8);
	return this;
}
ServerTemplate.prototype.echo = echo;


/**
 * Execute the child template and append its output
 * @methodOf ServerTemplate.prototype
 * @param {String} id The identifier for the nested template
 * @param {Object} data The data context for the nest template
 * @param {Function} next The continuation after the nested template
 * @return this
 * @type ServerTemplate
 **/
function include(id, data, next) {
	var parent = this, child = ServerTemplate.getTemplateByFilename(id, parent);
	child.addEventListener(ERROR, function(err) {
		parent.dispatchEvent(ERROR, err);
		// continue processing parent
		return next.call(parent, data);
	}).addEventListener(COMPLETE, function() {
		return next.call(parent, data);
	});

	child.exec(data);
}
ServerTemplate.prototype.include = include;


/**
 * Get a ServerTemplate object from a file
 * @methodOf ServerTemplate
 * @param {String} id The filename to use for the template
 * @param {Object} settings A hash of settings (or SereverTemplate object)
 * @return The template created from the file's content
 * @type ServerTemplate
 **/
function getTemplateByFilename(id, settings) {
	if (id[id.length - 1] === '/') { id += DEFAULT_PATH; }

	// populate template object
	var template   = new ServerTemplate(settings);
	template.input = MT;
	template.path  = id;

	return template;
}
ServerTemplate.getTemplateByFilename = getTemplateByFilename;


/**
 * Parse, execute, and send the requested file
 * @methodOf ServerTemplate
 * @param {http.ServerRequest} request The request to handle
 * @param {http.ServerResponse} response The response to write to
 * @return The template used to respond to the request
 * @type ServerTemplate
 **/
function handleRequest(request, response) {
	var started = false;

	var template = ServerTemplate.getTemplateByFilename(request.url, {
		request:  request,
		response: response,
		onerror:  function(err) {
			if (!started) { // send error response if no response yet sent
				var code = (err.errno === process.ENOENT) ? 404 : 500;
				this.response.writeHead(code, { 'Content-Type': 'text/plain' });
				this.response.end();
			}
			sys.log(err);
		},
		onexec: function() {
			started = true;
			this.response.writeHead(200, {
			//	'Content-Type':      getMime(filename),
				'Last-Modified':     this.stat.mtime.toUTCString(),
				'Transfer-Encoding': 'chunked'
			});
		},
		oncomplete: function() {
			this.response.end();
			sys.log('Complete: ' + request.url);
		}
	});

	return template.exec({});
}
ServerTemplate.handleRequest = handleRequest;
/** The root path to search for template files */
ServerTemplate.root = process.cwd();


// export the class
exports.ServerTemplate = ServerTemplate;

