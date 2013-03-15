/** ==================================================================== 
 * jsPDF Cell plugin
 * Copyright (c) 2013 Youssef Beddad, youssef.beddad@gmail.com
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ====================================================================
 */

(function (jsPDFAPI) {
//    'use strict';

    var maxLn = 0,
        lnP = 0,
        fontName,
        fontSize,
        fontStyle,
        lastCellPos = { x: undefined, y: undefined, w: undefined, h: undefined, ln: undefined },
        pages = 1,
        newPage = false,
        setLastCellPosition = function (x, y, w, h, ln) {
            lastCellPos = { x: x, y: y, w: w, h: h, ln: ln };
        },
        getLastCellPosition = function () {
            return lastCellPos;
        },
        setMaxLn = function (x) {
            maxLn = x;
        },
        getMaxLn = function () {
            return maxLn;
        },
        setLnP = function (x) {
            lnP = x;
        },
        getLnP = function (x) {
            return lnP;
        };

    jsPDFAPI.getTextDimensions = function (txt) {
        fontName = this.internal.getFont().fontName;
        fontSize = this.internal.getFontSize();
        fontStyle = this.internal.getFont().fontStyle;

        var px2pt = 1.545454545454545454545454,
            dimensions,
            text;

        text = document.createElement('font');
        text.id = "jsPDFCell";
        text.style = "font-family: ' + fontName + ';font-size:' + fontSize + 'pt;font-style: ' + fontStyle + ';";
        text.innerText = txt;

        document.body.appendChild(text);

        dimensions = { w: text.offsetWidth / px2pt, h: text.offsetHeight / px2pt};

        document.body.removeChild(text);

        return dimensions;
    };

    jsPDFAPI.cellAddPage = function () {
        this.addPage();
        setLastCellPosition(undefined, undefined, undefined, undefined, undefined);
        newPage = true;
        pages += 1;
        setLnP(1);
    };

    jsPDFAPI.cellInitialize = function () {
        maxLn = 0;
        lastCellPos = { x: undefined, y: undefined, w: undefined, h: undefined, ln: undefined };
        pages = 1;
        newPage = false;
        setLnP(0);
    };

    jsPDFAPI.cell = function (x, y, w, h, txt, ln) {
        if(this.printingHeaderRow !== true && this.lnMod !== 0){
            ln = ln + this.lnMod;
		}

        if ((((ln * h) + y + (h * 2)) / pages) >= this.internal.pageSize.height && pages === 1 && !newPage) {
            this.cellAddPage();

            if(this.printHeaders && this.tableHeaderRow){
                this.printHeaderRow(ln);
                this.lnMod++;
                ln++;
            }
            if (getMaxLn() === 0) {
                setMaxLn(Math.round((this.internal.pageSize.height - (h * 2)) / h));
            }
        } else if (newPage && getLastCellPosition().ln !== ln && getLnP() === getMaxLn()) {
            this.cellAddPage();

            if(this.printHeaders && this.tableHeaderRow){
                this.printHeaderRow(ln);
                this.lnMod++;
                ln++;
            }
        }

        var curCell = getLastCellPosition(),
            dim = this.getTextDimensions(txt),
            isNewLn = 1;
        if (curCell.x !== undefined && curCell.ln === ln) {
            x = curCell.x + curCell.w;
		}
        if (curCell.y !== undefined && curCell.y === y) {
            y = curCell.y;
        }
        if (curCell.h !== undefined && curCell.h === h) {
            h = curCell.h;
        }
        if (curCell.ln !== undefined && curCell.ln === ln) {
            ln = curCell.ln;
            isNewLn = 0;
        }
        if (newPage) {
            y = h * (getLnP() + isNewLn);
        } else {
            y = (y + (h * Math.abs(getMaxLn() * pages - ln - getMaxLn())));
        }
        this.rect(x, y, w, h);
        this.text(txt, x + 3, y + h - 3);
        setLnP(getLnP() + isNewLn);
        setLastCellPosition(x, y, w, h, ln);
        return this;
    };

    /**
     * Return an array containing all of the owned keys of an Object
     * @type {Function}
     * @return {String[]} of Object keys
     */
    jsPDFAPI.getKeys = (typeof Object.keys == 'function')
        ? function(object){
            if (!object) {
                return [];
            }
            return Object.keys(object);
        }
            : function(object) {
            var keys = [],
                property;

            for (property in object) {
                if (object.hasOwnProperty(property)) {
                    keys.push(property);
                }
            }

            return keys;
        };

    /**
     * Return the maximum value from an array
     * @param array
     * @param comparisonFn
     * @returns {*}
     */
    jsPDFAPI.arrayMax = function(array, comparisonFn) {
        var max = array[0],
            i, ln, item;

        for (i = 0, ln = array.length; i < ln; i++) {
            item = array[i];

            if (comparisonFn) {
                if (comparisonFn(max, item) === -1) {
                    max = item;
                }
            }
            else {
                if (item > max) {
                    max = item;
                }
            }
        }

        return max;
    };

    /**
     * Create a table from a set of data.
     * @param {Object[]} dataSet As array of objects containing key-value pairs
     * @param {Array} [headers] Omit or null to auto-generate headers at a performance cost
     * @param {Object} [config.printHeaders] True to print column headers at the top of every page
     * @param {Object} [config.autoSize] True to dynamically set the column widths to match the widest cell value
     * @param {Object} [config.autoStretch] True to force the table to fit the width of the page
     */
    jsPDFAPI.table = function(dataSet, headers, config){

        var models;

        /**
         * @property {Number} lnMod
         * Keep track of the current line number modifier used when creating cells
         */
        this.lnMod = 0;

        if(config){
            var autoSize        = config.autoSize || false,
                printHeaders    = this.printHeaders = config.printHeaders || true,
                autoStretch     = config.autoStretch || true;
        }

        if(!dataSet){
           throw 'No data for PDF table';
        }

        if(dataSet.isStore){
            var isStore = true;
            models = dataSet.data.items;
        } else {
            models = dataSet;
        }

        // Set headers
        if(headers === undefined || (headers === null)){
            // No headers defined so we derive from data
            headers = this.getKeys(models[0]);
        }

        if(config.autoSize){

            // Create Columns Matrix
            var columnMatrix = {},
                columnWidths = {},
                index,
                columnData;

            for (var i = 0, ln = headers.length; i < ln; i++) {
                index = headers[i];
                columnMatrix[index] = models.map(function(rec){
                    return rec[index];
                });

                var columnMinWidths = [], column;

                // get header width
                columnMinWidths.push(this.getTextDimensions(index).w);
                column = columnMatrix[index];

                // Get cell widths
                for (var j = 0, ln = columnMatrix[index].length; j < ln; j++) {
                    columnData = columnMatrix[index][j];
                    columnMinWidths.push(this.getTextDimensions(columnData).w);
                }

                // get final column width
                columnWidths[index] = jsPDFAPI.arrayMax(columnMinWidths);
            }
        }

        // -- Construct the table

        if (config.printHeaders){

            // Construct the header row
            var header, tableHeaderConfigs = [];

            for (var i = 0, ln = headers.length; i < ln; i++) {
                header = headers[i];
                tableHeaderConfigs.push([10, 10, columnWidths[header], 25, String(header)]);
            }

            // Store the table header config
            this.setTableHeaderRow(tableHeaderConfigs);

            // Print the header for the start of the table
            this.printHeaderRow(1);
        }

        // Construct the data rows
        var model;

        for (var i = 0, ln = models.length; i < ln; i++) {
            model = models[i];

            for (var j = 0, jln = headers.length; j < jln; j++) {
                index = headers[j];
                this.cell(10, 10, columnWidths[index], 25, String(model[index]), i+2);
            }
        }

        return this;
    };

    /**
     * Store the config for outputting a table header
     * @param {Object[]} config
     * An array of cell configs that would define a header row: Each config matches the config used by jsPDFAPI.cell
     * except the ln parameter is excluded
     */
    jsPDFAPI.setTableHeaderRow = function(config){
        this.tableHeaderRow = config;
    };

    /**
     * Output the store header row
     * @param lineNumber The line number to output the header at
     */
    jsPDFAPI.printHeaderRow = function(lineNumber){

        if (!this.tableHeaderRow){
            throw 'Property tableHeaderRow does not exist.';
        }

        var tableHeaderCell, tmpArray;

        this.printingHeaderRow = true;

        for (var i = 0, ln = this.tableHeaderRow.length; i < ln; i++) {

            tableHeaderCell = this.tableHeaderRow[i];
            tmpArray        = [].concat(tableHeaderCell);

            this.cell.apply(this, tmpArray.concat(lineNumber));
        }

        this.printingHeaderRow = false;
    };

})(jsPDF.API);
