const app = angular.module('batchEditorApp', []);
console.log = (async (...message) => {
    await chrome.runtime.sendMessage({message: message});
});

console.error = (async (...message) => {
    await chrome.runtime.sendMessage({message: message});
});

app.controller('batchEditorController', function ($scope) {
    $scope.phase = 0;

    $scope.$watch('input', async function (val) {
        if (val) {
            await chrome.storage.local.set({input: JSON.stringify(val)});
        }
    }, true);


    const defaultActions = ["prepend", "replace", "append"];

    function getDaysInMonth(month = (new Date().getMonth() + 1), year = (new Date().getFullYear())) {
        const max = new Date(year, month, 0).getDate();
        const days = [];
        for (let i = 1; i <= max; i++) {
            days.push(i);
        }

        if ($scope.input?.["day"]?.value > max) {
            $scope.input["day"].value = 1;
        }

        days.unshift(-1);

        return days;
    }

    function getMonths() {
        const months = [];
        for (let i = 1; i <= 12; i++) {
            months.push(i);
        }
        months.unshift(-1);
        return months;
    }

    function getYears() {
        const max = new Date().getFullYear();
        const years = [];
        for (let i = max; i >= 1750; i--) {
            years.push(i);
        }
        years.unshift(-1);
        return years;
    }

    $scope.editors = [
        {
            key: "title",
            type: "text",
            actions: defaultActions,
            default: "prepend",
        },
        {
            key: "artist",
            type: "text",
            actions: defaultActions,
            default: "replace",
        },
        {
            key: "keywords",
            type: "text",
            actions: defaultActions,
            default: "append",
        },
        {
            key: "latitude",
            type: "text",
            actions: defaultActions,
            default: "replace",
        },
        {
            key: "longitude",
            type: "text",
            actions: defaultActions,
            default: "replace",
        },
        {
            key: "day",
            type: "select",
            options: getDaysInMonth(),
            default: new Date().getDate(),
        },
        {
            key: "month",
            type: "select",
            options: getMonths(),
            default: new Date().getMonth() + 1,
            onChange: (value) => {
                const dayOptions = $scope.editors.find(e => e.key === "day");
                dayOptions.options = getDaysInMonth(value, $scope.input["year"].value);
            },
        },
        {
            key: "year",
            type: "select",
            options: getYears(),
            default: new Date().getFullYear(),
            onChange: (value) => {
                const dayOptions = $scope.editors.find(e => e.key === "day");
                dayOptions.options = getDaysInMonth($scope.input["month"].value, value);
            },
        },
        {
            key: "unstack",
        },
    ];

    function setDefault() {
        $scope.input = {};

        $scope.editors.forEach(e => {
            if (!$scope.input[e.key]) {
                $scope.input[e.key] = {};
            }

            const input = $scope.input[e.key];

            if (e.type === "select") {
                input.value = e.default;
            } else {
                input.action = e.default;
            }

            input.used = false;
        });
    }

    chrome.storage.local.get(["input"]).then(function ({input}) {
        try {
            $scope.input = JSON.parse(input);
        } catch {
            $scope.input = null;
        }

        if (!$scope.input) {
            setDefault();
        }
    }).catch(function () {
        setDefault();
    }).finally(() => {
        $scope.$applyAsync();
    });

    $scope.resetForm = setDefault;

    const isDefined = (value) => typeof value !== 'undefined' && value !== null;
    /**
     * Return LF delimited error message, or `null` if all is good.
     */
    const validateData = (data) => {
        if (!data) {
            return 'No data provided.';
        }

        const error = [];

        if (isDefined(data.day?.content)) {
            const day = parseInt(data.day.content, 10);
            if (isNaN(day) || day < -1 || day > 31 || day === 0) {
                error.push('Day must be between 1 and 31. Set to -1 for "Unknown".');
            }
            data.day.type = 'replace';
        }

        if (isDefined(data.month?.content)) {
            const month = parseInt(data.month.content, 10);
            if (isNaN(month) || month < -1 || month > 12 || month === 0) {
                error.push('Month must be between 1 and 12. Set to -1 for "Unknown".');
            }
            data.month.type = 'replace';
        }

        if (isDefined(data.year?.content)) {
            const year = parseInt(data.year.content, 10);
            const currentYear = new Date().getFullYear();
            if ((isNaN(year) || year < 1750 || year > currentYear) && year !== -1) {
                // 1750 is Photoprism defined year
                error.push('Year must be between 1750 and ' + currentYear + '. Set to -1 for "Unknown".');
            }
            data.year.type = 'replace';
        }

        return error.length > 0 ? error.join('\n') : null;
    };

    $scope.startApply = function (input) {
        const options = {};
        angular.forEach(input, (value, key) => {
            if (value.used) {
                options[key] = {
                    content: value.value,
                    type: value.action,
                };
            }
        });

        $scope.errors = validateData(options);

        if ($scope.errors) {
            throw new Error($scope.errors);
        }

        $scope.phase = 1;
        checkSelectionCountAndEditor()
            .then(() => {
                $scope.optionsToApply = options;
                $scope.phase = 2;
            })
            .catch((error) => {
                console.log(error);
                $scope.phase = 0;
                $scope.errors = error;
            }).finally(() => {
            $scope.$applyAsync();
        });
    };

    $scope.doApply = async function (save = false) {
        $scope.phase = 3;
        $scope.$applyAsync();

        try {
            await runBulk($scope.optionsToApply, save);
        } catch (e) {
            console.log(e);
            $scope.errors = e;
        }

        $scope.phase = 0;
        $scope.$applyAsync();
    };


    async function callFunction(func, ...args) {
        const tab = await getCurrentTab();

        const [{result}] = await chrome.scripting.executeScript({
            args,
            func: func,
            target: {
                tabId: tab.id,
            },
            world: "MAIN",
        });

        return result;
    }

    async function getCurrentTab() {
        let queryOptions = {active: true, lastFocusedWindow: true};
        // `tab` will either be a `tabs.Tab` instance or `undefined`.
        let [tab] = await chrome.tabs.query(queryOptions);
        return tab;
    }

    async function getTotalCount() {
        return $scope.totalCount = await callFunction(() => {
            const element = document.querySelector("#t-clipboard > button .count-clipboard");

            if (!element) {
                return 0;
            }

            const count = parseInt(element.textContent);

            if (isNaN(count) || !count) {
                return 0;
            }

            return count;
        });
    }

    /**
     * Checks if mor then one image/video is selected and the editor is open
     * @returns {Promise<void>}
     */
    async function checkSelectionCountAndEditor() {
        const count = await getTotalCount();

        if (count <= 1) {
            throw "2 or more images/videos need to be selected";
        }

        const isEditorOpen = await callFunction(() => {
            const element = document.querySelector(".v-dialog--active #tab-details");
            return !!element;
        });

        if (!isEditorOpen) {
            throw "Editor needs to be open with the first image/video";
        }
    }

    /**
     *
     * @returns `true` if the field is set, `false` otherwise
     */
    const updateField = (data, field) => {
        const type = data[field].type;
        const value = data[field].content;

        const element = document.forms[0].__vue__._data.inputs.find((element) =>
            element.$el.className.includes(`input-${field}`),
        );

        switch (type.toLowerCase()) {
            case 'prepend':
                element.internalValue = value + ' ' + element.internalValue;
                break;
            case 'append':
                element.internalValue += ' ' + value;
                break;
            case 'replace':
                element.internalValue = value;
                break;
            default:
                console.error(`'${type}' is not a valid way of updating a field.`);
                return false;
        }

        return true;
    };

    const pause = async (seconds) => new Promise((r) => setTimeout(r, seconds * 1000));

    /**
     * This function checks if all the images selected equal the total count,
     * under some conditions this chan differ,
     * indicating images that should not be manipulated are shown as selected
     * @returns {Promise<void>}
     */
    async function checkTotalCount() {

        $scope.progress = 0;
        $scope.$applyAsync();

        let count = 0;

        do {
            count++;
            $scope.progress = count;
            $scope.$applyAsync();

            const hasNext = await callFunction(() => {
                const rightButton = document.querySelector('.v-toolbar__items .action-next');
                return !rightButton.disabled;
            });

            if (!hasNext) {
                break;
            }

            await pause(1);

            await callFunction(() => {
                const rightButton = document.querySelector('.v-toolbar__items .action-next');
                rightButton.click();
            });

            await pause(1);
        } while (true);

        if (count !== $scope.totalCount) {
            throw "Selected Count differs from the found count, please reselect or check manually";
        }

        count = await goToFirstItem(count);

        if (count !== $scope.totalCount * 2) {
            throw "Selected Count differs from the found count, please reselect or check manually";
        }

    }

    async function goToFirstItem(count) {
        do {
            if (count !== false) {
                count++;
                $scope.progress = count;
                $scope.$applyAsync();
            }

            const hasNext = await callFunction(() => {
                const leftButton = document.querySelector('.v-toolbar__items .action-previous');
                return !leftButton.disabled;
            });

            if (!hasNext) {
                break;
            }

            await pause(1);

            await callFunction(() => {
                const leftButton = document.querySelector('.v-toolbar__items .action-previous');
                leftButton.click();
            });

            await pause(1);
        } while (true);

        return count;
    }

    async function runBulk(data, save = false) {
        let count = 0;

        await goToFirstItem(false);
        await checkTotalCount();

        $scope.progress = 0;
        $scope.$applyAsync();
        $scope.phase = 4;
        $scope.$applyAsync();
        do {
            let dirty = false, hasUnstack = false;

            for (let field of Object.keys(data)) {
                if (field === "unstack") {
                    hasUnstack = true;
                    continue;
                }
                dirty |= await callFunction(updateField, data, field);
            }

            if (!dirty) {
                console.warn('No field was set. Nothing has changed.');
                return;
            }
            if (save) {
                await callFunction(() => {
                    const applyButton = document.querySelector('button.action-apply');
                    applyButton.click();
                });

                if(hasUnstack) {
                    await callFunction(async () => {
                        document.querySelector("#tab-files > a").click()
                    });

                    await pause(1);

                    await callFunction(async () => {

                        const buttons = document.querySelectorAll('button.action-unstack');
                        buttons.forEach(b => b.click());
                    });
                }
            }
            count++;
            $scope.progress = count;
            $scope.$applyAsync();

            const hasNext = await callFunction(() => {
                const rightButton = document.querySelector('.v-toolbar__items .action-next');
                return !rightButton.disabled;
            });

            if (!hasNext) {
                break;
            }

            await pause(1);

            await callFunction(() => {
                const rightButton = document.querySelector('.v-toolbar__items .action-next');
                rightButton.click();
            });

            await pause(1);
        } while (true);

        if (save) {
            await savePhotos();
        }

        $scope.doneCount = count;
    }

    async function savePhotos() {
        await callFunction(() => {
            const doneButton = document.querySelector('button.action-done');
            doneButton.click();
        });
    }
});