/*
	Copyright (C) 2011 by Douglas Holmes, http://dragoonsoftware.com/

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/
(function($){
	//Called through selector
	$.fn.dragoon = function(options) {
		if(typeof options === 'object' || !options) {
			return Dragoon.init.apply(this, arguments);
		} else if (typeof options === 'string' && typeof Dragoon[options] === 'function') {
			return Dragoon[options].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof options === 'string' && typeof Dragoon[options] === 'object') {
			return Dragoon[options];
		} else {
			$.error('Dragoon.' + options + ' you say! There is no such object here.');
		}
	};
	
	Dragoon = {
		//Apply validation rules
		init: function(options) {
			options = options || {};
			
			var template = {
				alerts: false,
				length: null,
				regex: null,
				regexState: null,
				min: null,
				max: null,
				blur: null,
				invalid: null,
				template: []
			};
				
			return this.each(function() {
				try {
					var $element = $(this),
						metadata = (typeof $.metadata === 'undefined') ? {} : $element.metadata(),
						completeTemplate = {};
					$.extend(completeTemplate, template, metadata, options);
					completeTemplate.template = Dragoon.mergeArrays($element.attr('type'), Dragoon.readTemplateClasses(this), completeTemplate.template, metadata.template, options.template);
					Dragoon.applyTemplate(this, completeTemplate);
				} catch(e) {
					DragoonConsole.logError('Init', e);
				}
			});
		},
		//Returns an array of all class names of an element that match template names
		readTemplateClasses: function(element) {
			var templates = [];
			$.each(($(element).attr('class') || '').split(/\s+/), function() {
				if(typeof Dragoon.template[this] !== 'undefined') {
					templates.push('' + this);
				}
			});
			return templates;
		},
		//Stores all dragoon settings
		settings: {
			invalidClass: 'dragoon_invalid',
			validClass: 'dragoon_valid',
			preventInvalidSubmit: true
		},
		//Merges all arguments into a single array with no duplicates
		mergeArrays: function() {
			var newArr = [];
			//Concatenate all arguments
			for(var x = 0; x < arguments.length; x++) {
				if(typeof arguments[x] === 'undefined') continue;
				//Convert to an array if necessary
				if(typeof arguments[x] !== 'object') arguments[x] = [arguments[x]];
				newArr = newArr.concat(arguments[x]);
			}
			//Remove redundant/unnecessary items
			for(var x = newArr.length - 1; x >= 0; x--) {
				if(typeof newArr[x] === 'undefined') {
					newArr.splice(x, 1);
				}
				for(var y = 0; y < x; y++) {
					if(newArr[x] === newArr[y])
						newArr.splice(x, 1);
				}
			}
			return newArr;
		},
		//Used to get more accurate key codes
		generalKeyTranslation: {
			78: 46,		// .
			96: 48,		// Num0/0
			97: 49,		// Num1/1
			98: 50,		// Num2/2
			99: 51,		// Num3/3
			100: 52,	// Num4/4
			101: 53,	// Num5/5
			102: 54,	// Num6/6
			103: 55,	// Num7/7
			104: 56,	// Num8/8
			105: 57,	// Num9/9
			106: 42,	// *
			107: 61,	// +		--vasil
			109: 45,	// -
			110: 46,	// .
			188: 44,	// ,
			189: 45,	// -
			190: 46,	// .
			191: 47 	// /
		},
		//Used for translating shifted key codes
		shiftKeyTranslation: {
			48: 41,		//0/)
			49: 33,		//1/!
			50: 64,		//2/@
			51: 35,		//3/#
			52: 36,		//4/$
			53: 37,		//5/%
			54: 94,		//6/^
			55: 38,		//7/&
			56: 42,		//8/*
			57: 40,		//9/(
			107: 43		// =		--vasil
		},
		//These key codes should be ignored when processing keyboard events
		ignoreKeys: {
			0: 'Unknown',
			9: 'Tab',
			13: 'Enter',
			16: 'Shift',
			27: 'Esc',
			33: 'Page Up',
			34: 'Page Down',
			35: 'End',
			36: 'Home',
			37: 'Left',
			38: 'Up',
			39: 'Right',
			40: 'Down',
			//45: 'Insert',
			112: 'F1',
			113: 'F2',
			114: 'F3',
			115: 'F4',
			116: 'F5',
			117: 'F6',
			118: 'F7',
			119: 'F8',
			120: 'F9',
			121: 'F10',
			122: 'F11',
			123: 'F12'
		},
		keyEvent: function(e, input, callback) {
			DragoonConsole.debug(['Pressed character code ', e.which]);
			if((e.ctrlKey && e.which in {88: 'X'}) ||(!e.ctrlKey && !e.altKey && !e.metaKey && !(e.which in Dragoon.ignoreKeys))) {
				var data;
				if(typeof e.dragoon !== 'undefined') {
					data = e.dragoon;
				} else {
					data = {
						backspace: e.which == 8,
						caret: 0,
						character: null,
						event: e,
						input: input,
						keyCode: e.which,
						prevText: input.value,
						selection: '',
						selectionStart: 0,
						selectionEnd: 0,
						text: null
					}
					//Determine which key was pressed
					if(e.ctrlKey || e.which in {8: 'backspace', 46: 'Delete'}) {
						data.character = '';
					} else if(e.shiftKey && e.which in Dragoon.shiftKeyTranslation) {
						data.character = String.fromCharCode(Dragoon.shiftKeyTranslation[e.which]);
					} else if(e.which in Dragoon.generalKeyTranslation) {
						data.character = String.fromCharCode(Dragoon.generalKeyTranslation[e.which]);
					} else {
						data.character = String.fromCharCode(e.which);
					}
					//Determine caret position
					if (document.selection) {
						input.focus();
						var selection = document.selection.createRange();
						data.selection = selection.text;
						selection.moveStart('character', -input.value.length); //Move Selection to start
						data.caret = selection.text.length - data.selection.length;
						data.selectionStart = data.caret;
						data.selectionEnd = data.caret + data.selection.length;
					} else {
						data.caret = input.selectionStart;
						data.selectionStart = data.caret;
						data.selectionEnd = input.selectionEnd;
						data.selection = data.prevText.substring(data.selectionStart, data.selectionEnd);
					}
					//Calculate new text
					if(e.which in {8: 'backspace'} && data.selection.length == 0) {
						data.text = data.prevText.substring(0, data.selectionStart - 1) + data.character + data.prevText.substring(data.selectionEnd);
					} else if (e.which in {46: 'Delete'} && data.selection.length == 0) {
						data.text = data.prevText.substring(0, data.selectionStart) + data.character + data.prevText.substring(data.selectionEnd + 1);
					} else {
						data.text = data.prevText.substring(0, data.selectionStart) + data.character + data.prevText.substring(data.selectionEnd);
					}
					
					e.dragoon = data;
				}
				
				DragoonConsole.info([
					'Character: "', data.character, '" (code ', data.keyCode,  ') at position ', data.caret,
					'\nChange from "', data.prevText, '" to "', data.text, '"', 
					'\nSelected Range: From ', data.selectionStart, ' to ', data.selectionEnd, ' ("', data.selection, '")']);
				
				if(data.text !== '' && typeof callback === 'function') return callback(data);
			} else {
				DragoonConsole.log(['Character code ', e.which, ' ignored']);
			}
		},
		setCaretPosition: function(input, position) {
			if(input.setSelectionRange) {
				input.focus();
				input.setSelectionRange(position, position);
			} else if (input.createTextRange) {
				var range = input.createTextRange();
				range.collapse(true);
				range.moveEnd('character', position);
				range.moveStart('character', position);
				range.select();
			}
		},
		handleInvalid: function(element) {
			var returnValue = $(element).triggerHandler('invalid.dragoon');
			DragoonConsole.log(returnValue);
			if(returnValue !== false) {
				element.value = '';
			} else {
				$(element).addClass(Dragoon.settings.invalidClass);
				if(typeof element.id === 'string' && element.id.length > 0) {
					$('label[for='+element.id+']').addClass(Dragoon.settings.invalidClass);
				}
			}
		},
		//Applies a dragoon template to an element by name
		applyTemplate: function (element, templates) {
			//Remove any existing Dragoon validation
			Dragoon.clearValidation(element);
			
			//Initialize Dragoon object data
			$(element).data('dragoon', { valid: true });
			
			//Make sure that something was passed
			if (templates == null) return;
			//If the passed value wasn't an array, turn it into one
			if (!templates.pop) templates = [templates];
			
			//Loop through the passed templates
			for (var x = 0; x < templates.length; x++) {
				var template = templates[x];
				//String templates are replaced by the template whose name matches the string's value
				if (typeof template === 'string') template = Dragoon.template[template];
				//Verify that the template exists before trying to apply it
				if (typeof template === 'undefined') continue;
				//Arrays are split and added to templates
				if (typeof template.pop !== 'undefined') {
					while(template.length > 0) {
						templates.push(template.pop());
					}
					continue;
				}
				for(key in template) {
					try {
						if(template[key] == null) continue;
						if(key === 'template') {
							templates.push(template.template);
						} else if(typeof Dragoon.mechanism[key] === 'function') {
							Dragoon.mechanism[key].call(element, template[key]);
						}
					} catch (e) {
						DragoonConsole.logError('applyTemplate<'+key+'>', e);
					}
				}
			}
			
			$(element)
				//Handle paste events the same as blur events
				.bind('paste.dragoon', function() { 
					setTimeout(function() {
						$(element).trigger('blur.dragoon');
					}, 0);
				})
				//Remove and invalid markings on focus
				.focus('blur.dragoon', function() {
					$(element).removeClass(Dragoon.settings.invalidClass);
					if(typeof element.id === 'string' && element.id.length > 0) {
						$('label[for='+element.id+']').removeClass(Dragoon.settings.invalidClass);
					}
				});
			
			//Disable Autorepeat
			(function() {
				var disableKeypress = {};
				var lastKey;
				
				//Detect the key code of the last keystroke
				$(element).bind('keydown.dragoon', function(e) {
					lastKey = e.which;
				});
				
				//Allow the first keypress to go through and then return false from all following events until the keyup
				$(element).bind('keypress.dragoon', function(e) {
					//Allow autorepeat for the backspace character
					if(e.which == 8) return;
					//For all others, disable it
					if(!disableKeypress[lastKey]) {
						disableKeypress[lastKey] = true;
					} else {
						DragoonConsole.info(['Autorepeat Blocked for character code ', e.which]);
						return false;
					}
				});
				//Once the keyup event is triggered, allow further input
				$(element).bind('keyup.dragoon', function(e) {
					disableKeypress[e.which] = false;
				});
			})();
		
			//Attach dragoon functionality to the form, if it's not already attached
			var form = $(element).parents('form:first');
			if (typeof form.data('dragoon') == 'undefined') {
				form.data('dragoon', {})
					.bind('submit.dragoon', function(e) {
						$(this).find('input, textarea').trigger('blur.dragoon');
						if(Dragoon.settings.preventInvalidSubmit && $(this).find('.'+Dragoon.settings.invalidClass).length > 0) {
							//Trigger an event and get the return value
							var returnValue = $(this).triggerHandler('invalid.dragoon');
							//If a handler returns false, cancel the default action of preventing form submission
							if(returnValue !== false) {
								return false;
							}
						}
					});
				form.find('button[type=reset]').bind('click.dragoon', function() {
					form.find('.'+Dragoon.settings.invalidClass).removeClass(Dragoon.settings.invalidClass);
				});
			}
		},
		//Removes all validation on the specified element
		clearValidation: function (element) {
			$(element)
				.unbind('blur.dragoon')
				.unbind('change.dragoon')
				.unbind('invalid.dragoon')
				.unbind('keydown.dragoon')
				.unbind('keyup.dragoon')
				.unbind('paste.dragoon');
		},
		//Flashes the invalid class
		flashInvalid: function (element) {
			$(element).addClass(Dragoon.settings.invalidClass);
			setTimeout(function() {
				if($(element).is(":focus")) {
					$(element).removeClass(Dragoon.settings.invalidClass);
				}
			}, 100);
		},
		//Flashes the valid class
		flashValid: function (element) {
			$(element).addClass(Dragoon.settings.validClass);
			setTimeout(function() {
				$(element).removeClass(Dragoon.settings.validClass);
			}, 300);
		},
		mechanism: {
			//Events
			init: function (callback) {
				//Called immediately
				callback.call(this);
			},
			blur: function (callback) {
				//Called on blur
				$(this).bind('blur.dragoon', callback);
			},
			keyup: function (callback) {
				//Called on keyup
				$(this).bind('keyup.dragoon', function(e) {
					return Dragoon.keyEvent(e, this, callback);
				});
			},
			keydown: function (callback) {
				//Called on keydown
				$(this).bind('keydown.dragoon', function(e) {
					return Dragoon.keyEvent(e, this, callback);
				});
			},
			invalid: function (callback) {
				//Called on blur with invalid data
				$(this).bind('invalid.dragoon', callback);
			},
			//Prevents input in the specified field from exceeding the specified length
			length: function (length) {
				var element = this;
				if (typeof length == 'undefined' || length == 0 || length == null) return;
				element.setAttribute('maxLength', length);
				if (element.value.length > length) element.value = element.value.substring(0, length);
				var forceLength = function (e) {
					if (element.value.length > length) {
						element.value = element.value.substring(0, element.maxLength);
						return false;
					}
				}
				var forceLength_keydown = function (e) {
					return Dragoon.keyEvent(e, this, function(data) {
						if (data.text.length > length) {
							Dragoon.flashInvalid(element);
							return false;
						}
					});
				}
				$(element)
					.bind('blur.dragoon', forceLength)
					.bind('change.dragoon', forceLength)
					.bind('keydown.dragoon', forceLength_keydown);
			},
			//Clears the field when the value is changed if the value doesn't match the specified regular expression
			regex: function (regex) {
				var element = this;
				if (typeof regex == 'undefined' || regex == null) return;
				var forceRegex = function (e) {
					if (element.value != '' && element.value.match(regex) == null) {
						Dragoon.handleInvalid(element);
					}
				}
				var forceRegex_Keydown = function (e) {
					return Dragoon.keyEvent(e, this, function(data) {
						if (data.text.match(regex) != null) {
							Dragoon.flashValid(element);
						}
					});
				}
				$(element)
					.bind('blur.dragoon', forceRegex)
					.bind('change.dragoon', forceRegex)
					.bind('keydown.dragoon', forceRegex_Keydown);
			},
			//Cancels keystrokes when they cause the input to not match the specified regular expression
			regexState: function (regex) {
				var element = this;
				if (typeof regex == 'undefined' || regex == null) return;
				$(element).bind('keydown.dragoon', function(e) {
					return Dragoon.keyEvent(e, this, function(data) {
						var allowKey = (data.text.match(regex) != null)
						if(!allowKey) {
							Dragoon.flashInvalid(element);
							setTimeout(function() {
								element.value = data.prevText;
								Dragoon.setCaretPosition(element, data.selectionStart);
							}, 0);
						}
						return allowKey;
					});
				});
			},
			//Calls a callback function when the field matches the specified regular expression
			regexTrigger: function (regex) {
				var element = this;
				if (typeof regex == 'undefined' || regex == null) return;
				if (!regex.length) regex = [regex];
				var triggerResponse = function (e) {
					Dragoon.keyEvent(e, this, function(data) {
						$.each(regex, function() {
								var regex = this;
								setTimeout(function() { 
									if (element.value.match(regex.regex) != null) {
										regex.callback.apply(element, [e, data]);
									}
								}, 0);
						});
					});
				}
				$(element)
					.bind('change.dragoon', triggerResponse)
					.bind('keydown.dragoon', triggerResponse);
			},
			//Forces the value of the field to exceed the specified minimum
			min: function (value) {
				var element = this;
				if (typeof value == 'undefined' || value === '' || value == null) return;
				var enforeceMin, enforceMin_keydown;
				if (typeof value == 'number') {
					enforceMin = function (e) {
						if (element.value == '') return;
						var compareValue;
						var matches = element.value.match(/^-?\d+\.\d*|^-?\d*/);
						if (matches == null) {
							if (Dragoon.alerts) alert('The value entered must numeric');
							Dragoon.handleInvalid(element);
							return;
						}
						element.value = matches[0];
						compareValue = parseFloat(matches[0]);
						if (isNaN(compareValue)) {
							if (Dragoon.alerts) alert('The value entered must numeric');
							Dragoon.handleInvalid(element);
							return;
						}
						if (compareValue < value) {
							if (Dragoon.alerts) alert('The value entered must exceed ' + value);
							Dragoon.handleInvalid(element);
						}
					}
					enforceMin_keydown = function (e) {
						return Dragoon.keyEvent(e, this, function(data) {
							var compareValue;
							if(data.text.match(/^-?\d+\.\d*$|^-?\d*$/) == null) {
								Dragoon.flashInvalid(element);
								return false;
							}
							if(data.text == '-') return;
							compareValue = parseFloat(data.text);
							if(isNaN(compareValue) || compareValue < value) {
								Dragoon.flashInvalid(element);
								return false;
							}
						});
					}
				} else {
					enforceMin = function (e) {
						if (element.value == '') return;
						if (element.value < value) {
							if (Dragoon.alerts) alert('The value entered must exceed ' + value);
							Dragoon.handleInvalid(element);
						}
					}
					enforceMin_keydown = function (e) {
						return Dragoon.keyEvent(e, this, function(data) {
							if(data.text < value) {
								Dragoon.flashInvalid(element);
								return false;
							}
						});
					}
				}
				$(element)
					.bind('blur.dragoon', enforceMin)
					.bind('change.dragoon', enforceMin)
					.bind('keydown.dragoon', enforceMin_keydown);
			},
			//Prevents the value of the field from exceeding the specified maximum
			max: function (value) {
				var element = this;
				if (typeof value == 'undefined' || value === '' || value == null) return;
				var enforceMax, enforceMax_keydown;
				if (typeof value == 'number') {
					enforceMax = function (e) {
						if (element.value == '') return;
						var compareValue;
						var matches = element.value.match(/^-?\d+\.\d+|^-?\d*/);
						if (matches == null) {
							if (Dragoon.alerts) alert('The value entered must numeric');
							Dragoon.handleInvalid(element);
							return;
						}
						element.value = matches[0];
						compareValue = parseFloat(matches[0]);
						if (isNaN(compareValue)) {
							if (Dragoon.alerts) alert('The value entered must numeric');
							Dragoon.handleInvalid(element);
							return;
						}
						if (compareValue > value) {
							if (Dragoon.alerts) alert('The value entered must not exceed ' + value);
							Dragoon.handleInvalid(element);
						}
					}
					enforceMax_keydown = function (e) {
						return Dragoon.keyEvent(e, this, function(data) {
							var compareValue;
							if(data.text.match(/^-?\d+\.\d*$|^-?\d*$/) == null) {
								Dragoon.flashInvalid(element);
								return false;
							}
							if(data.text == '-') return;
							compareValue = parseFloat(data.text);
							if(isNaN(compareValue) || compareValue > value) {
								Dragoon.flashInvalid(element);
								return false;
							}
						});
					}
				} else {
					enforceMax = function (e) {
						if (element.value == '') return;
						if (element.value > value) {
							if (Dragoon.alerts) alert('The value entered must not exceed ' + value);
							Dragoon.handleInvalid(element);
						}
					}
					enforceMax_keydown = function (e) {
						return Dragoon.keyEvent(e, this, function(data) {
							if(data.text > value) {
								Dragoon.flashInvalid(element);
								return false;
							}
						});
					}
				}
				$(element)
					.bind('blur.dragoon', enforceMax)
					.bind('change.dragoon', enforceMax)
					.bind('keydown.dragoon', enforceMax_keydown);
			}
		},
		template: {
			'Date': {
				description: 'Forces MM/dd/yyyy format, verifies that the date is an actual date, and places \'/\' characters automatically.',
				length: 10,
				regex: /^(0[1-9]|1[012])\/([123]0|[012][1-9]|31)\/(19[0-9]{2}|2[0-9]{3})$/,
				regexState: /^[01]$|^(0[1-9]|1[012])\/?$|^(0[1-9]|1[012])\/([123]0?|[012][1-9]?|31?)$|^(0[1-9]|1[012])\/([123]0|[012][1-9]|31)\/?$|^(0[1-9]|1[012])\/([123]0|[012][1-9]|31)\/(19?|2[0-9]?)$|^(0[1-9]|1[012])\/([123]0|[012][1-9]|31)\/(19[0-9]{1,2}|2[0-9]{2,3})$/,
				regexTrigger: [{
					regex: /^(0[1-9]|1[012])$|^(0[1-9]|1[012])\/([123]0|[012][1-9]|31)$/,
					callback: function (e, data) {
						if(!data.backspace) this.value += '/';
					}
				}],
				blur: function (e) {
					if (this.value != '' && !Dragoon.template['Date'].methods.isDate(this.value)) Dragoon.handleInvalid(this);
				},
				methods: {
					//Returns true if the specified string is a date (MM/dd/yyyy)
					isDate: function (value) {
						if (isNaN(new Date(value)) || value.match(Dragoon.template['Date'].regex) == null) {
							if (Dragoon.alerts) { alert("Please enter the date in the format MM/dd/yyyy") };
							return false;
						}
						var values = value.split('/');
						var month = parseInt(values[0], 10),
							day = parseInt(values[1], 10),
							year = parseInt(values[2], 10),
							//February has 29 days in years evenly divisible by 4 except years that
							//are also evenly dvisible by 100 and not evenly divisible by 400
							daysArray = [0, 31, ((year % 4 == 0) && ((year % 100 != 0) || (year % 400 == 0))) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
						if (day > daysArray[month]) {
							if (Dragoon.alerts) { alert("Please enter a valid day") };
							return false;
						}
						return true;
					}
				}
			},
			'Decimal2': {
				description: 'Forces a decimal with one or two digits to the right of the decimal.',
				regex: /^\d+$|^\d+\.\d{1,2}$/,
				regexState: /^\d*$|^\d+\.?\d{0,2}$/
			},
			'Email': {
				description: 'Verifies email format',
				regex: /^[-a-zA-Z0-9~!$%\^&\*_=\+}{'\?\.\/"\\]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.([a-zA-Z]{2,6})|(\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\]))(:[0-9]{1,5})?$/,
				invalid: function (e) {
					if (Dragoon.alerts) { alert(this.value + ' is not a valid email address') };
				}
			},
			'FutureDate': {
				description: 'Verifies that the value entered is a date and is after the current date.',
				blur: function (e) {
					if (this.value == '') return;
					if (!Dragoon.template['Date'].methods.isDate(this.value)) {
						this.value = '';
					} else if ((new Date(this.value)) < (new Date())) {
						if (Dragoon.alerts) { alert(this.value + ' is before the current date') };
						Dragoon.handleInvalid(this);
					}
				}
			},
			'Integer': {
				description: 'Forces integer format.',
				regex: /^\d+$/,
				regexState: /^\d*$/
			},
			'Number': {
				description: 'Forces numeric format',
				regex: /^\d+$|^\d+\.\d+$/,
				regexState: /^\d*$|^\d+\.?\d*$/
			},
			'PastDate': {
				description: 'Verifies that the value entered is a date and is before the current date.',
				blur: function (e) {
					if (this.value == '') return;
					if (!Dragoon.template['Date'].methods.isDate(this.value)) {
						Dragoon.handleInvalid(this);
					} else if ((new Date(this.value)) > (new Date())) {
						if (Dragoon.alerts) { alert(this.value + ' is after the current date') };
						Dragoon.handleInvalid(this);
					}
				}
			},
			'Phone': {
				description: 'Forces 000-000-0000 format',
				length: 12,
				regex: /^[2-9][0-9]{2}-[2-9][0-9]{2}-[0-9]{4}$/,
				regexState: /^[2-9]$|^[2-9][0-9]{0,2}$|^[2-9][0-9]{2}-?$|^[2-9][0-9]{2}-[2-9]?$|^[2-9][0-9]{2}-[2-9][0-9]{0,2}$|^[2-9][0-9]{2}-[2-9][0-9]{2}-?$|^[2-9][0-9]{2}-[2-9][0-9]{2}-[0-9]{0,4}$/,
				regexTrigger: [{
					regex: /^[2-9][0-9]{2}$|^[2-9][0-9]{2}-[2-9][0-9]{2}$/,
					callback: function (e, data) {
						if(!data.backspace) this.value += '-';
					}
				}]
			},
			'Required': {
				blur: function (e) {
					if (this.value == '') {
						Dragoon.handleInvalid(this);
					}
				},
				invalid: function() {
					return false;
				}
			},
			'SSN': {
				description: 'Forces 000-00-0000 format',
				length: 11,
				regex: /^\d{3}-\d{2}-\d{4}$/,
				regexState: /^\d{0,3}$|^\d{3}-\d{0,2}$|^\d{3}-\d{2}-\d{0,4}$/,
				regexTrigger: [{
					regex: /^\d{3}$|^\d{3}-\d{2}$/,
					callback: function (e, data) {
						if(!data.backspace) this.value += '-';
					}
				}]
			},
			'Zip': {
				description: 'Forces 00000 or 00000-0000 format',
				length: 10,
				regex: /^\d{5}$|^\d{5}-\d{4}$/,
				regexState: /^\d{0,5}$|^\d{5}-?$|^\d{5}-\d{0,4}$/
			},
			'Zip5': {
				description: 'Forces 00000 format',
				length: 5,
				regex: /^\d{5}$/,
				regexState: /^\d{0,5}$/
			},
			'Zip+4': {
				description: 'Forces 00000-0000 format',
				length: 10,
				regex: /^\d{5}-\d{4}$/,
				regexState: /^\d{0,5}$|^\d{5}-?$|^\d{5}-\d{0,4}$/,
				regexTrigger: [{
					regex: /^\d{5}$/,
					callback: function (e, data) {
						if(!data.backspace) this.value += '-';
					}
				}]
			},
			//Aliases for use with jQuery Validation
			'date': {alias: true, template: 'Date' },
			'email': {alias: true, template: 'Email'},
			'number': {alias: true, template: 'Number'},
			'digits': {alias: true, template: 'Integer'}
		},
		//Sets the level of detail provided in the console
		logLevel: function(logLevel) {
			DragoonConsole.setLogLevel(logLevel);
		},
		logTest: function() {
			DragoonConsole.error('This is an error');
			DragoonConsole.warn('This is a warning');
			DragoonConsole.log('This is a log message');
			DragoonConsole.info('This is information');
			DragoonConsole.debug('This is debug information');
		}
	}
	
	//Console Logging
	var DragoonConsole = {
		//Enable or disable console message types (default)
		ERROR:	true,	//Level 1
		WARN:	true,	//Level 2
		LOG:	false,	//Level 3
		INFO:	false,	//Level 4
		DEBUG:	false,	//Level 5
		//Set the log level
		setLogLevel: function(logLevel) {
			var logLevel = parseInt(logLevel, 10);
			//Validate that logLevel is a number between 0 and 5
			if(isNaN(logLevel)) return;
			logLevel = Math.max(Math.min(5, logLevel), 0);
			//Enable/Disable logging types as specified
			DragoonConsole.ERROR = logLevel >= 1;
			DragoonConsole.WARN = logLevel >= 2;
			DragoonConsole.LOG = logLevel >= 3;
			DragoonConsole.INFO = logLevel >= 4;
			DragoonConsole.DEBUG = logLevel >= 5;
		},
		/*
			All console messages write the message to the console if supported as
			well as a variable to ensure that the messages can always be retreived
		*/
		message: {
			error: '',
			warn: '',
			log: '',
			info: '',
			debug: ''
		},
		//Standard error logging function
		logError: function(fnName, e) {
			DragoonConsole.error(fnName + ' - ' + e.name + ': ' + e.message);
		}
	}
	
	$.each(['error', 'warn', 'log', 'info', 'debug'], function() {
		var type = this;
		var enabledProp = this.toUpperCase();
		
		DragoonConsole[type] = function(message) {
			if(DragoonConsole[enabledProp]) {
				//Convert message to an array if it's not already
				if (typeof message.pop == 'undefined') message = [message];
				//Prepend (Dragoon) to all console messages
				message = ['(Dragoon) '].concat(message).join('');
				try {
					console[type](message);
				} catch(e) { }
				DragoonConsole.message[type] = DragoonConsole.message[type].concat(message, '\n');
			}
		}
	});
})( jQuery );