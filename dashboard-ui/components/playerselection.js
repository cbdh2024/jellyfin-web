﻿define(['appSettings', 'events', 'browser', 'libraryMenu', 'loading'], function (appSettings, events, browser, libraryMenu, loading) {
    'use strict';

    var currentDisplayInfo;

    function mirrorItem(info) {

        var item = info.item;

        MediaController.getCurrentPlayer().displayContent({

            ItemName: item.Name,
            ItemId: item.Id,
            ItemType: item.Type,
            Context: info.context
        });
    }

    function mirrorIfEnabled(info) {

        info = info || currentDisplayInfo;

        if (info && MediaController.enableDisplayMirroring()) {

            var player = MediaController.getPlayerInfo();

            if (!player.isLocalPlayer && player.supportedCommands.indexOf('DisplayContent') != -1) {
                mirrorItem(info);
            }
        }
    }

    function showPlayerSelection(button, enableHistory) {

        var playerInfo = MediaController.getPlayerInfo();

        if (!playerInfo.isLocalPlayer) {
            showActivePlayerMenu(playerInfo);
            return;
        }

        loading.show();

        MediaController.getTargets().then(function (targets) {

            var menuItems = targets.map(function (t) {

                var name = t.name;

                if (t.appName && t.appName != t.name) {
                    name += " - " + t.appName;
                }

                return {
                    name: name,
                    id: t.id,
                    selected: playerInfo.id == t.id
                };

            });

            require(['actionsheet'], function (actionsheet) {

                loading.hide();

                var menuOptions = {
                    title: Globalize.translate('HeaderSelectPlayer'),
                    items: menuItems,
                    positionTo: button,

                    resolveOnClick: true

                };

                // Unfortunately we can't allow the url to change or chromecast will throw a security error
                // Might be able to solve this in the future by moving the dialogs to hashbangs
                if (!((enableHistory !== false && !browser.chrome) || AppInfo.isNativeApp)) {
                    menuOptions.enableHistory = false;
                }

                actionsheet.show(menuOptions).then(function (id) {

                    var target = targets.filter(function (t) {
                        return t.id == id;
                    })[0];

                    MediaController.trySetActivePlayer(target.playerName, target);

                    mirrorIfEnabled();

                });
            });
        });
    }

    function showActivePlayerMenu(playerInfo) {

        require(['dialogHelper', 'dialog', 'emby-checkbox', 'emby-button'], function (dialogHelper) {
            showActivePlayerMenuInternal(dialogHelper, playerInfo);
        });
    }

    function showActivePlayerMenuInternal(dialogHelper, playerInfo) {

        var html = '';

        var dialogOptions = {
            removeOnClose: true
        };

        dialogOptions.modal = false;
        dialogOptions.entryAnimationDuration = 160;
        dialogOptions.exitAnimationDuration = 160;
        dialogOptions.autoFocus = false;

        var dlg = dialogHelper.createDialog(dialogOptions);

        dlg.classList.add('promptDialog');

        html += '<div class="promptDialogContent" style="padding:1.5em;">';
        html += '<h2 style="margin-top:.5em;">';
        html += (playerInfo.deviceName || playerInfo.name);
        html += '</h2>';

        html += '<div>';

        if (playerInfo.supportedCommands.indexOf('DisplayContent') != -1) {

            html += '<label class="checkboxContainer">';
            var checkedHtml = MediaController.enableDisplayMirroring() ? ' checked' : '';
            html += '<input type="checkbox" is="emby-checkbox" class="chkMirror"' + checkedHtml + '/>';
            html += '<span>' + Globalize.translate('OptionEnableDisplayMirroring') + '</span>';
            html += '</label>';
        }

        html += '</div>';

        html += '<div style="margin-top:1em;display:flex;justify-content: flex-end;">';

        html += '<button is="emby-button" type="button" class="button-flat button-accent-flat btnRemoteControl promptDialogButton">' + Globalize.translate('ButtonRemoteControl') + '</button>';
        html += '<button is="emby-button" type="button" class="button-flat button-accent-flat btnDisconnect promptDialogButton ">' + Globalize.translate('ButtonDisconnect') + '</button>';
        html += '<button is="emby-button" type="button" class="button-flat button-accent-flat btnCancel promptDialogButton">' + Globalize.translate('ButtonCancel') + '</button>';
        html += '</div>';

        html += '</div>';
        dlg.innerHTML = html;

        var chkMirror = dlg.querySelector('.chkMirror');

        if (chkMirror) {
            chkMirror.addEventListener('change', onMirrorChange);
        }

        var destination = '';

        var btnRemoteControl = dlg.querySelector('.btnRemoteControl');
        if (btnRemoteControl) {
            btnRemoteControl.addEventListener('click', function () {
                destination = 'nowplaying.html';
                dialogHelper.close(dlg);
            });
        }

        dlg.querySelector('.btnDisconnect').addEventListener('click', function () {
            MediaController.disconnectFromPlayer();
            dialogHelper.close(dlg);
        });

        dlg.querySelector('.btnCancel').addEventListener('click', function () {
            dialogHelper.close(dlg);
        });

        dialogHelper.open(dlg).then(function () {
            if (destination) {
                Dashboard.navigate(destination);
            }
        });
    }

    function onMirrorChange() {
        MediaController.enableDisplayMirroring(this.checked);
    }

    function onCastButtonClicked() {

        showPlayerSelection(this);
    }

    function bindCastButton() {
        var btnCast = document.querySelector('.headerButton-btnCast');

        if (btnCast) {
            btnCast.removeEventListener('click', onCastButtonClicked);
            btnCast.addEventListener('click', onCastButtonClicked);
        }
    }

    document.addEventListener('headercreated', bindCastButton);
    bindCastButton();

    pageClassOn('pagebeforeshow', "page", function () {

        var page = this;

        currentDisplayInfo = null;
    });

    pageClassOn('displayingitem', "libraryPage", function (e) {

        var info = e.detail;
        mirrorIfEnabled(info);
    });

    return {
        show: showPlayerSelection
    };
});