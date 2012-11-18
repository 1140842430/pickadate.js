/*!
 * datepicker.js v0.9.8 - 17 November, 2012
 * By Amsul (http://amsul.ca)
 * Hosted on https://github.com/amsul/pickadate.js
 */

/**
 * TODO: month & year dropdown selectors
 * TODO: add methods onSelectDate, onMonthChange, onOpenCalendar, onCloseCalendar
 */

/*jshint
   debug: true,
   devel: true,
   browser: true,
   asi: true
 */



;(function( $, window, document, undefined ) {

    'use strict';



    var

        // Globals & constants
        SECONDS_IN_DAY = 86400000,
        DAYS_IN_WEEK = 7,
        WEEKS_IN_CALENDAR = 6,
        DAYS_IN_CALENDAR = WEEKS_IN_CALENDAR * DAYS_IN_WEEK,

        STRING_DIV = 'div',
        STRING_TR = 'tr',
        STRING_DATE_DIVIDER = '/',

        STRING_PREV = 'prev',
        STRING_NEXT = 'next',

        STRING_PREFIX_DATEPICER = 'datepicker--',

        $window = $( window ),


        /**
         * Helper functions
         */

        // Check if a value is an array
        isArray = Array.isArray || function( value ) {
            return {}.toString.call( value ) === '[object Array]'
        },

        // Create a dom node string
        create = function( wrapper, item, klass, data ) {

            // If the item is an array, do a join
            item = ( isArray( item ) ) ? item.join( '' ) : item

            // Check for a data binding
            data = ( data && data.name ) ? ' data-' + data.name + '="' + data.value + '"' : ''

            // Check for a class
            klass = ( klass ) ? ' class="' + klass + '"' : ''

            // Return the wrapped item
            return '<' + wrapper + data + klass + '>' + item + '</' + wrapper + '>'
        }, //create

        // Create a calendar date
        createDate = function( datePassed ) {

            var
                year, month, date, newDate


            // If the date passed is an array
            if ( isArray( datePassed ) ) {

                year = datePassed[ 0 ]

                // Figure out the month
                month = (function( monthId ) {

                    // If the month is more than
                    // December, increase the year
                    // and make it January
                    if ( monthId > 11 ) {
                        year += 1
                        return 0
                    }

                    // If the month is less than
                    // January, decrease the year
                    // and make it December
                    if ( monthId < 0 ) {
                        year -= 1
                        return 11
                    }

                    // Otherwise just return it
                    return monthId
                })( datePassed[ 1 ] )

                date = datePassed[ 2 ]

                // Create the new date
                newDate = new Date( year, month, date )
            }


            // If datePassed is true
            else if ( datePassed === true ) {

                // Set new date to today
                newDate = new Date()

                // Set the time to midnight (for comparison purposes)
                newDate.setHours( 0, 0, 0, 0 )
            }


            // If datePassed is a number
            else if ( !isNaN( datePassed ) ) {

                // Create a new date with it
                newDate = new Date( datePassed )
            }


            // Return the calendar date object
            return {
                YEAR: newDate.getFullYear(),
                MONTH: newDate.getMonth(),
                DATE: newDate.getDate(),
                DAY: newDate.getDay(),
                TIME: newDate.getTime()
            }
        }, //createDate




        /**
         * Create a Date Picker
         */
        DatePicker = function( $element, options ) {


            var
                // Today
                DATE_TODAY,

                // The date selected
                DATE_SELECTED,

                // The minimum selectable date
                DATE_MIN,

                // The maximum selectable date
                DATE_MAX,

                // The month in focus on the calendar
                MONTH_FOCUSED,

                // The merged settings
                SETTINGS,

                // The Picker prototype
                P,

                // The Picker constructor
                Picker = function( $element, options ) {

                    // Ensure a valid element was passed
                    if ( $element[ 0 ].nodeName !== 'INPUT' ) return false

                    // Ensure workable options are available
                    if ( typeof options !== 'object' ) options = {}

                    // Merge the settings
                    SETTINGS = $.extend( {}, DatePicker.defaults, options )

                    // Create and return the picker
                    return new P.create( $element, options )
                }




            /**
             * Create the Picker prototype
             */

            P = Picker.prototype = {

                /**
                 * Attach the Picker constructor
                 */
                constructor: Picker,


                /**
                 * Create the picker
                 */
                create: function( $element, options ) {

                    var element = element = $element[ 0 ]

                    // Store the elements
                    P.$element = $element
                    P._element = element

                    // Convert into a regular text input
                    // to remove user-agent stylings
                    element.type = 'text'

                    // Set the element as readonly
                    element.readOnly = true

                    // Create a calendar object and
                    // immediately render it
                    P.calendar = P.createCalendarObject().render()

                    // If the element has focus on load
                    if ( element === document.activeElement ) {

                        // Trigger the focus handler
                        $element.trigger( 'focus' )
                    }

                    return P
                }, //create



                /**
                 * Create a calendar object
                 */
                createCalendarObject: function() {

                    var

                        /**
                         * Create the calendar table head
                         * that contains all the weekday labels
                         */
                        tableHead = (function() {

                            var
                                wrappedTableHead = function( weekday ) {
                                    return create( 'th', weekday, SETTINGS.class_weekdays )
                                },
                                weekdaysCollection = ( SETTINGS.show_weekdays_short ) ? SETTINGS.weekdays_short : SETTINGS.weekdays_full

                            // Go through each day of the week
                            // and return a wrapped header row.
                            // Take the result and apply another
                            // table head wrapper to group
                            return create( 'thead', create( STRING_TR, weekdaysCollection.map( wrappedTableHead ) ) )
                        })(),


                        /**
                         * Create the calendar table body
                         */
                        createTableBody = function() {

                            var
                                // The loop date object
                                loopDate,

                                // A pseudo index will be the divider
                                // between the previous month and the
                                // focused month
                                pseudoIndex,

                                // An array that will holde the
                                // classes and binding for each
                                // looped date
                                classAndBinding,

                                // Boolean to check if looped day is
                                // of the month in focus or not.
                                // Initially set to true
                                isMonthFocused = true,

                                // Collection of the dates visible on the calendar
                                // * This gets discarded at the end
                                calendarDates = [],

                                // Collection of weeks visible on calendar
                                calendarWeeks = [],

                                // Get today's date
                                dateToday = P.getDateToday(),

                                // Get the minimum date
                                dateMinimum = P.getDateMin(),

                                // Get the maximum date
                                dateMaximum = P.getDateMax(),

                                // Get the selected date
                                dateSelected = P.getDateSelected(),

                                // Get the month in focus
                                monthFocused = P.getMonthFocused(),

                                // Count the number of days
                                // in the focused month
                                countMonthDays = P.getCountDays( monthFocused.YEAR, monthFocused.MONTH ),

                                // Count the days to shift the start of the month
                                countShiftby = P.getCountShiftDays( monthFocused.DATE, monthFocused.DAY ),


                                // Set the class and binding for each looped date.
                                // Returns an array with 2 items:
                                // 1) The classes string
                                // 2) The data binding object
                                setDateClassAndBinding = function( loopDate ) {

                                    var
                                        // Boolean check for date state
                                        isDateDisabled = false,

                                        // Create a collection for the classes
                                        // with the default class already included
                                        klassCollection = [ SETTINGS.class_calendar_date ]


                                    // Set the class as in or out of focus
                                    // depending on the month
                                    klassCollection.push( ( isMonthFocused ) ? SETTINGS.class_day_infocus : SETTINGS.class_day_outfocus )


                                    // If it's less than the minimum date
                                    // or greater than the maximum date
                                    if ( loopDate.TIME < dateMinimum.TIME || loopDate.TIME > dateMaximum.TIME ) {
                                        isDateDisabled = true
                                        klassCollection.push( SETTINGS.class_day_disabled )
                                    }


                                    // If it's today, add the class
                                    if ( loopDate.TIME === dateToday.TIME ) {
                                        klassCollection.push( SETTINGS.class_day_today )
                                    }


                                    // If it's the selected date, add the class
                                    if ( loopDate.TIME === dateSelected.TIME ) {
                                        klassCollection.push( SETTINGS.class_day_selected )
                                    }


                                    // Return an array with the classes and data binding
                                    return [

                                        // Return the joined collection
                                        klassCollection.join( ' ' ),

                                        // Create the data binding object
                                        // with the value as a string
                                        {
                                            name: ( isDateDisabled ) ? 'disabled' : 'date',
                                            value: [
                                                loopDate.YEAR,
                                                loopDate.MONTH + 1,  // We do +1 just to give an appropriate display
                                                loopDate.DATE,
                                                loopDate.DAY,
                                                loopDate.TIME
                                            ].join( STRING_DATE_DIVIDER )
                                        }
                                    ]
                                } //setDateClassAndBinding



                            // Go through all the days in the calendar
                            // and map a calendar date
                            for ( var index = 0; index < DAYS_IN_CALENDAR; index += 1 ) {

                                // Get the distance between the index
                                // and the count to shift by.
                                // This will serve as the separator
                                // between the previous, current,
                                // and next months.
                                pseudoIndex = index - countShiftby


                                // Create a calendar date with
                                // a negative or positive pseudoIndex
                                loopDate = createDate([ monthFocused.YEAR, monthFocused.MONTH, pseudoIndex ])


                                // If the pseudoIndex is zero or negative,
                                // we need the dates from the previous month.
                                // If the pseudoIndex is greater than the days
                                // in the month, we need dates from the next month.
                                if ( pseudoIndex <= 0 || pseudoIndex > countMonthDays ) {
                                    isMonthFocused = false
                                }

                                // Otherwise we need dates from the focused month.
                                else {
                                    isMonthFocused = true
                                }


                                // Set the date class and bindings on the looped date
                                classAndBinding = setDateClassAndBinding( loopDate )


                                // Create the looped date wrapper,
                                // and then create the table cell wrapper
                                // and finally pass it to the calendar array
                                calendarDates.push( create( 'td', create( STRING_DIV, loopDate.DATE, classAndBinding[ 0 ], classAndBinding[ 1 ] ) ) )


                                // Check if it's the end of a week.
                                // * We add 1 for 0index compensation
                                if ( index % DAYS_IN_WEEK + 1 === DAYS_IN_WEEK ) {

                                    // Wrap the week and pass it into the calendar weeks
                                    calendarWeeks.push( create( STRING_TR, calendarDates.splice( 0, DAYS_IN_WEEK ) ) )
                                }

                            } //endfor



                            // Join the dates and wrap the calendar body
                            return create( 'tbody', calendarWeeks, SETTINGS.class_calendar_body )
                        }, //createTableBody


                        /**
                         * Get the nav for next and previous
                         * month as a string
                         */
                        createMonthNav = function() {

                            var
                                // Get the minimum date
                                dateMinimum = P.getDateMin(),

                                // Get the maximum date
                                dateMaximum = P.getDateMax(),

                                createMonthTag = function( tagName ) {

                                    // If the tag is STRING_PREV, and month focused is
                                    // less or equal to the minimum date month,
                                    // or if tag is STRING_NEXT month focused is
                                    // greater or equal to the maximum date month,
                                    // return an empty string
                                    if ( dateMinimum && ( tagName === STRING_PREV && MONTH_FOCUSED.MONTH <= dateMinimum.MONTH && MONTH_FOCUSED.YEAR <= dateMinimum.YEAR ) || dateMaximum && ( tagName === STRING_NEXT && MONTH_FOCUSED.MONTH >= dateMaximum.MONTH && MONTH_FOCUSED.YEAR >= dateMaximum.YEAR ) ) {
                                        return ''
                                    }

                                    // Otherwise, return the created tag
                                    return create( STRING_DIV, SETTINGS[ 'month_' + tagName ], SETTINGS[ 'class_month_' + tagName ], { name: 'nav', value: tagName } )
                                }

                            return createMonthTag( STRING_PREV ) + createMonthTag( STRING_NEXT )
                        }, //createMonthNav


                        /**
                         * Get the default collection
                         * of items in a calendar
                         * * Depends on at least one calendar body
                         */
                        getDefaultCalendarItems = function() {
                            return [

                                // The prev/next month tags
                                create( STRING_DIV, createMonthNav(), SETTINGS.class_month_nav ),

                                // The calendar month tag
                                create( STRING_DIV, P.getFocusedMonth(), SETTINGS.class_month ),

                                // The calendar year tag
                                create( STRING_DIV, P.getFocusedYear(), SETTINGS.class_year )
                            ]
                        } //getDefaultCalendarItems


                    /**
                     * Return the calendar object methods
                     */
                    return {

                        /**
                         * Render a complete calendar
                         */
                        render: function() {

                            var
                                // Create a reference to this calendar object
                                calendarObject = this,

                                // Create the collection of calendar items
                                calendarItems = (function() {

                                    var
                                        // First create a new calendar table body
                                        tableBody = createTableBody(),

                                        // Then get the default calendar items
                                        collection = getDefaultCalendarItems()

                                    // Create the calendar table,
                                    // and push it into the collection
                                    collection.push( create( 'table', [ tableHead, tableBody ], SETTINGS.class_calendar ) )

                                    // Return the collection
                                    return collection
                                })(), //calendarItems


                                // Create a new calendar box
                                // with the items collection
                                calendarBoxString = create( STRING_DIV, calendarItems, SETTINGS.class_calendar_box ),


                                // Event to set the calendar as active
                                onCalendarActive = function() {
                                    P.calendar.setCalendarActive( true )
                                },

                                // Event to set the calendar as inactive
                                onCalendarInactive = function() {
                                    P.calendar.setCalendarActive()
                                }



                            // If a calendar holder already exists
                            if ( P.$holder ) {

                                // Just replace it with the calendar string
                                P.$holder.html( calendarBoxString )

                                // And then return
                                return calendarObject
                            }

                            // Otherwise if there's no calendar holder
                            // wrap the box with the holder and
                            // create the jQuery object
                            // while binding delegated events
                            P.$holder = $( create( STRING_DIV, calendarBoxString, SETTINGS.class_picker_holder ) ).on({
                                click: P.onClickCalendar,
                                mouseenter: onCalendarActive,
                                mouseleave: onCalendarInactive
                            })


                            // Insert the calendar after the element
                            // while binding the events
                            P.$element.on({

                                // Prevent user from keying a value
                                keypress: function() { return false },

                                // On tab, close the calendar
                                keydown: function( event ) {
                                    var keycode = ( event.keyCode ) ? event.keyCode : event.which
                                    if ( keycode === 9 ) {
                                        P.calendar.close()
                                    }
                                },

                                // On focus, open the calendar
                                focusin: function() { P.calendar.open() },

                                mouseenter: onCalendarActive,
                                mouseleave: onCalendarInactive

                            }).after( P.$holder )


                            // Create a random calendar id
                            calendarObject.id = Math.floor( Math.random()*1e9 )


                            // Return the calendarObject
                            return calendarObject
                        }, //render


                        /**
                         * Open the calendar
                         */
                        open: function() {

                            var
                                // Create a reference to this calendar object
                                calendarObject = this,


                                /**
                                 * Check if the click position asks
                                 * for the calendar to be closed
                                 */
                                onClickWindow = function() {

                                    // If the calendar is opened
                                    if ( calendarObject.isOpen && !calendarObject.isActive ) {

                                        // Close the calendar
                                        P.calendar.close()
                                    }
                                }


                            // If it's already open, do nothing
                            if ( calendarObject.isOpen ) {
                                return calendarObject
                            }


                            // Set calendar as open
                            calendarObject.isOpen = true

                            // Add the "opened" class to the calendar holder
                            P.$holder.addClass( SETTINGS.class_picker_open )


                            // Bind the click event to the window
                            $window.on( 'click.P' + calendarObject.id, onClickWindow )

                            return calendarObject
                        }, //open


                        /**
                         * Close the calendar
                         */
                        close: function() {

                            var
                                // Create a reference to this calendar object
                                calendarObject = this


                            // Set calendar as closed
                            calendarObject.isOpen = false

                            // Remove the "opened" class from the calendar holder
                            P.$holder.removeClass( SETTINGS.class_picker_open )

                            // Unbind the click event from the window
                            $window.off( 'click.P' + calendarObject.id )

                            return calendarObject
                        }, //close


                        /**
                         * Set the calendar as active
                         * ie. hovered over by the user
                         */
                        setCalendarActive: function( trueOrFalse ) {

                            var
                                // Create a reference to this calendar object
                                calendarObject = this

                            // Set the calendar state
                            calendarObject.isActive = trueOrFalse || false

                            return calendarObject
                        }, //setCalendarActive


                        /**
                         * Set a day as selected by receiving
                         * the day jQuery object
                         */
                        setCalendarDate: function( $dayTargeted ) {

                            var
                                // Create a reference to this calendar object
                                calendarObject = this,

                                // Get the selected day
                                $daySelected = P.findSelectedDay(),

                                // Get the selected date
                                dateSelected = P.getDateSelected(),

                                // Get the focused month
                                monthFocused = P.getMonthFocused(),

                                // Create the targetted date array
                                // from the clicked date
                                dateTargeted = (function() {

                                    // If there is a day targetted
                                    if ( $dayTargeted ) {

                                        var dateTargetedArray = $dayTargeted.data( 'date' ).split( STRING_DATE_DIVIDER )

                                        // Create the target calendar date
                                        // while floating the values
                                        return {
                                            YEAR: +dateTargetedArray[ 0 ],
                                            MONTH: +dateTargetedArray[ 1 ] - 1, // We minus 1 to get the month at 0index
                                            DATE: +dateTargetedArray[ 2 ],
                                            DAY: +dateTargetedArray[ 3 ],
                                            TIME: +dateTargetedArray[ 4 ]
                                        }
                                    }
                                })()


                            // Check if there has been no change in date
                            // just return it
                            if ( dateTargeted && dateTargeted.TIME === dateSelected.TIME ) {
                                return P
                            }


                            // Set the target as the newly selected date
                            DATE_SELECTED = dateTargeted || DATE_SELECTED


                            // If it's the same month
                            if ( dateTargeted && dateTargeted.MONTH === monthFocused.MONTH ) {

                                // Remove the "selected" state from the selected date
                                $daySelected.removeClass( SETTINGS.class_day_selected )

                                // Add the "selected" state to the targeted date
                                $dayTargeted.addClass( SETTINGS.class_day_selected )
                            }

                            // Otherwise if there's been a change in month
                            else {

                                // Set the target as the newly focused month
                                MONTH_FOCUSED = dateTargeted || MONTH_FOCUSED

                                // Render a new calendar
                                calendarObject.render()
                            }


                            // If a day was targetted
                            if ( $dayTargeted ) {

                                // Set the element value
                                P._element.value = DATE_SELECTED.DATE + ' ' + P.getSelectedMonth() + ', ' + DATE_SELECTED.YEAR

                                // Close the calendar
                                calendarObject.close()
                            }

                            return calendarObject
                        }, //setCalendarDate


                        /**
                         * Change the month visible
                         * on the calendar
                         */
                        changeMonth: function( direction ) {

                            var
                                calendarObject = this,

                                // Add or substract a month
                                // based on the direction
                                monthAddOrSubtract = ( direction === STRING_PREV ) ? -1 : 1

                            // Set the month to show in focus
                            P.setMonthFocused( MONTH_FOCUSED.YEAR, MONTH_FOCUSED.MONTH + monthAddOrSubtract, MONTH_FOCUSED.DATE )

                            // Set the selected day
                            calendarObject.setCalendarDate()

                            return calendarObject
                        } //changeMonth

                    } //endreturn
                }, //createCalendarObject



                /**
                 * Get today's date calendar object
                 */
                getDateToday: function() {

                    // Create a new date for today
                    return DATE_TODAY || ( DATE_TODAY = createDate( true ) )
                }, //getDateToday



                /**
                 * Get the minimum date allowed on the calendar
                 */
                getDateMin: function() {

                    return DATE_MIN || (DATE_MIN = (function( settingsDate ) {

                        var dateMinimum

                        // Return false if there is no minimum date
                        if ( !settingsDate ) { return false }


                        // If the date is not an array,
                        // set the minimum date to today
                        if ( !isArray( settingsDate ) ) {
                            return P.getDateToday()
                        }


                        // Otherwise construct the date while fixing month index
                        // and return the new calendar date
                        return createDate([ settingsDate[ 0 ], settingsDate[ 1 ] - 1, settingsDate[ 2 ] ])
                    })( SETTINGS.date_min ))
                }, //getDateMin



                /**
                 * Get the maximum date allowed on the calendar
                 */
                getDateMax: function() {

                    return DATE_MAX || (DATE_MAX = (function( settingsDate, dateToday ) {

                        // Return false if there is no maximum date
                        if ( !settingsDate ) { return false }

                        // Check if a positive number was passed
                        if ( !isNaN( settingsDate ) && settingsDate > 0 ) {

                            // Create a calendar date while
                            // setting the maximum date by adding the number
                            return createDate([ dateToday.YEAR, dateToday.MONTH, dateToday.DATE + settingsDate ])
                        }

                        // Check if an array was passed
                        if ( isArray( settingsDate ) ) {

                            // Create a calendar date while
                            // compensating for month index
                            return createDate([ settingsDate[ 0 ], settingsDate[ 1 ] - 1, settingsDate[ 2 ] ])
                        }

                        // Return false for everything else
                        return false
                    })( SETTINGS.date_max, P.getDateToday() ))
                }, //getDateMax



                /**
                 * Get the date that determines
                 * the month to show in focus
                 */
                getMonthFocused: function() {

                    // If there's a date set to focus, return it
                    // otherwise focus on the date selected
                    return MONTH_FOCUSED || ( MONTH_FOCUSED = P.getDateSelected() )
                }, //getMonthFocused

                /**
                 * Set the date that determines
                 * the month to show in focus
                 */
                setMonthFocused: function( year, month, date ) {

                    // Create and return the month focused
                    return ( MONTH_FOCUSED = createDate([ year, month, date ]) )
                }, //setMonthFocused



                /**
                 * Get the date that determines
                 * which date is selected
                 */
                getDateSelected: function() {

                    // If there's a date selected, return it
                    // otherwise figure out the date
                    return DATE_SELECTED || (DATE_SELECTED = (function() {

                        var
                            // Try to parse the value from the input element
                            dateEntered = Date.parse( P._element.value )


                        // If there's no valid date in the input
                        if ( isNaN( dateEntered ) ) {

                            // Get and return today's date
                            return P.getDateToday()
                        }


                        // Otherwise, create and return a new date
                        // using the date entered
                        return createDate( dateEntered )
                    })())
                }, //getDateSelected


                /**
                 * Get the count of the number of
                 * days in a month, given the
                 * month and year
                 */
                getCountDays: function( year, month ) {

                    var
                        // Set flip based on if month is
                        // before or after July
                        flip = ( month > 6 ) ? true : false

                    // If it's February
                    if ( month === 1 ) {

                        // If it's not a leap year
                        // then 28 otherwise 29
                        return ( year % 4 ) ? 28 : 29
                    }


                    // If it's an odd month ID
                    if ( month % 2 ) {

                        // If it's after July then 31
                        // otherwise 30
                        return ( flip ) ? 31 : 30
                    }


                    // If it's an even month ID
                    // and it's after July then 30
                    // otherwise 31
                    return ( flip ) ? 30 : 31
                }, //getCountDays


                /**
                 * Get the count of the number of
                 * days to shift the month by,
                 * given the date and day of week
                 */
                getCountShiftDays: function( date, dayIndex ) {

                    var
                        // Get the column index for the
                        // day if month starts on 0
                        tempColumnIndex = date % DAYS_IN_WEEK,

                        // Get the absolute difference
                        absoluteDifference = Math.abs( dayIndex - tempColumnIndex )


                    // Compare the day index if the
                    // month starts on the first day
                    // with the day index
                    // the date actually falls on
                    return ( dayIndex >= tempColumnIndex ) ?

                        // If the actual position is greater
                        // shift by the difference in the two
                        absoluteDifference :

                        // Otherwise shift by the difference
                        // between the week length and absolute difference
                        DAYS_IN_WEEK - absoluteDifference
                }, //getCountShiftDays


                /**
                 * Get the focused month
                 */
                getFocusedMonth: function() {
                    var monthsCollection = ( SETTINGS.show_months_full ) ? SETTINGS.months_full : SETTINGS.months_short
                    return monthsCollection[ MONTH_FOCUSED.MONTH ]
                }, //getFocusedMonth


                /**
                 * Get the focused year
                 */
                getFocusedYear: function() {
                    return MONTH_FOCUSED.YEAR
                }, //getFocusedYear


                /**
                 * Get the selected date
                 */
                getSelectedDate: function() {
                    return DATE_SELECTED.DATE
                }, //getSelectedDate


                /**
                 * Get the selected month as a string
                 */
                getSelectedMonth: function() {
                    var monthsCollection = ( SETTINGS.show_months_full ) ? SETTINGS.months_full : SETTINGS.months_short
                    return monthsCollection[ DATE_SELECTED.MONTH ]
                }, //getSelectedMonth


                /**
                 * Get the selected month as a string
                 */
                getSelectedYear: function() {
                    return DATE_SELECTED.YEAR
                }, //getSelectedYear



                /**
                 * Find the day element node
                 * of the selected day
                 */
                findSelectedDay: function() {
                    return P.$holder.find( '.' + SETTINGS.class_day_selected )
                }, //findSelectedDay



                /**
                 * Update the selected day
                 * when receiving a delegated
                 * click on a day in the calendar
                 */
                onClickCalendar: function( event ) {

                    var
                        // Get the jQuery target
                        $target = $( event.target || event.srcTarget ),

                        // Get the target data
                        targetData = $target.data()

                    // If there's a date provided
                    if ( targetData.date ) {

                        // Set the selected day
                        P.calendar.setCalendarDate( $target )

                        return
                    }


                    // If there's a navigator provided
                    if ( targetData.nav ) {

                        // Change the month according to direction
                        P.calendar.changeMonth( targetData.nav )
                    }


                    // Put focus back onto the element
                    P.$element.focus()
                } //onClickCalendar


            } //Picker.prototype



            // Return a new Picker constructor
            return new Picker( $element, options )
        } //DatePicker




    /**
     * Default options for the picker
     */
    DatePicker.defaults = {

        months_full: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
        months_short: [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ],

        weekdays_full: [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
        weekdays_short: [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],

        month_prev: '&#9664;',
        month_next: '&#9654;',

        // Date limits
        date_min: true,
        date_max: false,

        // Display strings
        show_months_full: true,
        show_weekdays_short: true,

        class_picker_open: STRING_PREFIX_DATEPICER + 'opened',
        class_picker_holder: STRING_PREFIX_DATEPICER + 'holder',

        class_calendar_box: STRING_PREFIX_DATEPICER + 'calendar__box',

        class_calendar: STRING_PREFIX_DATEPICER + 'calendar',
        class_calendar_body: STRING_PREFIX_DATEPICER + 'calendar__body',
        class_calendar_date: STRING_PREFIX_DATEPICER + 'calendar__date',

        class_year: STRING_PREFIX_DATEPICER + 'year',

        class_month: STRING_PREFIX_DATEPICER + 'month',
        class_month_nav: STRING_PREFIX_DATEPICER + 'month__nav',
        class_month_prev: STRING_PREFIX_DATEPICER + 'month__prev',
        class_month_next: STRING_PREFIX_DATEPICER + 'month__next',

        class_week: STRING_PREFIX_DATEPICER + 'week',
        class_weekdays: STRING_PREFIX_DATEPICER + 'weekday',

        class_day_disabled: STRING_PREFIX_DATEPICER + 'day__disabled',
        class_day_selected: STRING_PREFIX_DATEPICER + 'day__selected',
        class_day_today: STRING_PREFIX_DATEPICER + 'day__today',
        class_day_infocus: STRING_PREFIX_DATEPICER + 'day__infocus',
        class_day_outfocus: STRING_PREFIX_DATEPICER + 'day__outfocus',

        class_box_months: STRING_PREFIX_DATEPICER + 'holder__months',
        class_box_years: STRING_PREFIX_DATEPICER + 'holder__years',
        class_box_weekdays: STRING_PREFIX_DATEPICER + 'holder__weekdays'
    } //DatePicker.defaults



    /**
     * Extend jQuery
     */
    $.fn.datepicker = function( options ) {
        return this.each(function() {
            var $this = $( this )
            if ( !$this.data( 'widgets.datepicker' ) ) {
                $this.data( 'widgets.datepicker', new DatePicker( $this, options ) )
            }
            return this
        })
    }


})( jQuery, window, document );





