# stencil

stencil is a templating engine designed by Andy VanWagoner
([thetalecrafter](http://github.com/thetalecrafter))
to enable templates to run in an environment with asynchronous I/O,
such as [node](http://nodejs.org), as well as in the browser.

While there have been many other libraries with the same claims,
all of the ones currently maintained use the mustache syntax,
while this uses asp / erb / php style syntax.

## Features

  * Async nested templates
  * Async tag to ensure template is processed sequentially
  * Use the same template code both server and client side


## Shared templates

The motivator for stencil was to share templates between server and client code.
The template can be used server side to generate a widget in the initial page load,
and then the template can be included on the page to update the widget.

The code to generate and update a widget can be the same file.


## Usage - template code

Templates are specified using php/asp syntax, with code inside special tags.
By default the tags are php-style:

```php
<? javascript code here ?>
```

There are also suffixes to the opening tag for ouput, include, and async blocks.

```php
<?= 'Today is ' + (new Date()) // result is html encoded and included in output ?>
<?= 'hello', ' ', 'world' // multiple results can be output ?>
<?- '<em>Important</em>' // This output won't be encoded ?>

<?# 'child-template-id' // result passed as id to include() ?>
<?# { id:'child', async:'~' }, { custom:'data' } // override options and data variables in child template ?>

<?! setTimeout(next, 1000); // functionally equivalent to php sleep(1) ?>
<?! someAsyncFunction(param1, function whendone(result) {
		// do stuff with result
		print(result);
		next(); // continue processing the rest of the template
	}); ?>
```

Members of the data object passed to exec are in the scope of the template code:

```html
<script type="text/template" id="template"><[CDATA[
	Why I don't teach English anymore:
	<?= message ?>.
]]></script>
<script>
	stencil({ id:'template' }, { message:'The book is not on the table' },
		function(err, result) {
			if (err) return console.log('The template failed to run.');
			console.log('The template result was:' + result);
		}
	);
</script>
```


Important note:

Unlike regular code tags, async tags cannot not include partial statements.
All of the code inside will be wrapped into a function.
All of the code following will also be wrapped into a function.

This would not work:

```php
<?! if (true) { ?>some output<? } ?>
```

Since compiled it would be similar to:

```javascript
(function(next){ if (true) { })(function() { print('some output'); } });
```


## Usage - client side

```html
<script src="stencil.js"></script>
<script type="text/template" id="dom_id">
	<[CDATA[
	... template code here ...
	]]>
</script>
<script>
	stencil.compile({ id:'dom_id' }, function(err, template) {
		template(
			{ data:object },
			function(data) { /* optional - use the data chunks */ },
			function(err, result) { /* all done */ },
		);
	});

	// or

	stencil('dom_id', { data:object }, function(err, result) {
		/* all done */ 
		if (err) { /* you broke it */ return; }
		/* use the result */
	});
</script>
```


## Usage - server side

```javascript
var stencil = require('./stencil');

stencil('/path/to/template', { data:object },
	function(data) { /* use the data chunks */ },
	function(err, result) { /* all done */ }
);

// same variations apply as client side.
```


## Usage - custom tags

```javascript
stencil({
	id:    id,
	start: '`',
	stop:  '`',
	echo:  'print',
	safe:  'encode',
	nest:  ' include this template:',
	async: '@'
}, data, function(err, result) {
	// here's my result
});

// template code:
My pet is `if (hungry) { `hungry` } else { `sleepy` }`.
His name is: `print pet.name`.
He looks like: ` include this template: 'looks_like', pet `.
`@my_async_function(function(result) { print(result); next(); });`
the end.
```


## Usage - synchronous

I created a way to be synchronous, if you really want to. The caveat here
is that you cannot actually do anything asynchronous in your template, or
you will only get partial results (up to the point that your async code
started). Includes are made synchronously.

```javascript
try { var result = stencil({ id:'id', sync_include:true }, data); }
catch (err) { /* You broke it. */ }
```


## License 

(The MIT License)

Copyright (c) 2012 Andy VanWagoner

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

