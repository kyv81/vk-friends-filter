let friendsFilter = (function () {
    let friends = localStorage.friends,
        friendsList = localStorage.friendsList,
        filterLeft = '',
        filterRight = '',
        searchLeftInput = document.querySelector('#search-left'),
        searchRightInput = document.querySelector('#search-right'),
        friendsLeftList = document.querySelector('#friends-left-list'),
        friendsRightList = document.querySelector('#friends-right-list'),
        buttonSave = document.querySelector('#button-save');

    let login = () => {
        return new Promise((resolve, reject) => {
            VK.init({
                apiId: 6305211
            });

            VK.Auth.login(response => {
                if (response.status == 'connected') {
                    resolve(response);
                } else {
                    reject(new Error('Не удалось авторизоваться'));
                }
            }, 2);
        });
    };

    let callApi = (method, params) => {
        return new Promise((resolve, reject) => {
            VK.api(method, params, result => {
                if (result.error) {
                    reject(new Error('Не удалось вызвать метод API: ' + method));
                } else {
                    resolve(result.response)
                }
            });
        });
    };

    let getFriends = () => {
        return new Promise((resolve) => {
            if (friends) {
                friends = JSON.parse(friends);
                friendsList = JSON.parse(friendsList);
                resolve();
            } else {
                callApi('friends.get', { v: '5.64', fields: 'photo_100' })
                    .then(response => {
                        friends = [];
                        friendsList = [];
                        response.items.forEach((item) => {
                            let o = {};

                            ({
                                id: o.id,
                                first_name: o.first_name,
                                last_name: o.last_name,
                                photo_100: o.photo_100
                            } = item);
                            friends.push(o);
                        });
                        resolve();
                    });
            }
        });
    };

    let addFriendsToHTML = (elems, templateName, filter) => {
        let template = require(`../${templateName}.hbs`);

        return template({
            friends: elems.filter((item) => {
                return isMatching(item.first_name, filter) || isMatching(item.last_name, filter);
            })
        });
    };

    let isMatching = (full, chunk) => {
        return !!~full.toLowerCase().indexOf(chunk.toLowerCase());
    };

    let moveFriend = (elem, dir = 'to') => {
        let friend = elem.closest('.friend');
        let id = friend.dataset.id;

        if (dir == 'to') {
            let f = friends.filter((item) => {
                return item.id == id;
            })[0];

            friendsList.push(f);
            friends = friends.filter((item) => {
                return item.id != id;
            });
        } else {
            let f = friendsList.filter((item) => {
                return item.id == id;
            })[0];

            friends.push(f);
            friendsList = friendsList.filter((item) => {
                return item.id != id;
            });
        }

        friendsLeftList.innerHTML = addFriendsToHTML(friends, 'friends', filterLeft);
        friendsRightList.innerHTML = addFriendsToHTML(friendsList, 'friendsList', filterRight);
    };

    let Dragger = new function () {
        let dragObject = {};
        let self = this;

        function onMouseDown(e) {

            if (e.which != 1) return;

            let elem = e.target.closest('.draggable');

            if (!elem) return;

            dragObject.elem = elem;

            dragObject.downX = e.pageX;
            dragObject.downY = e.pageY;

            return false;
        }

        function onMouseMove(e) {
            if (!dragObject.elem) return;

            if (!dragObject.avatar) {
                let moveX = e.pageX - dragObject.downX;
                let moveY = e.pageY - dragObject.downY;

                if (Math.abs(moveX) < 3 && Math.abs(moveY) < 3) {
                    return;
                }

                dragObject.avatar = createAvatar(e);
                if (!dragObject.avatar) {
                    dragObject = {};
                    return;
                }

                let coords = getCoords(dragObject.avatar);
                dragObject.shiftX = dragObject.downX - coords.left;
                dragObject.shiftY = dragObject.downY - coords.top;

                startDrag(e);
            }

            dragObject.avatar.style.left = e.pageX - dragObject.shiftX + 'px';
            dragObject.avatar.style.top = e.pageY - dragObject.shiftY + 'px';

            return false;
        }

        function onMouseUp(e) {
            if (dragObject.avatar) {
                finishDrag(e);
            }

            dragObject = {};
        }

        function finishDrag(e) {
            let dropElem = findDroppable(e);

            if (!dropElem) {
                self.onDragCancel(dragObject);
            } else {
                self.onDragEnd(dragObject, dropElem);
            }
        }

        function createAvatar(e) {

            let old = {
                backgroundColor: dragObject.elem.style.backgroundColor
            };

            let style = getComputedStyle(dragObject.elem);
            let avatar = dragObject.elem.cloneNode(true);
            avatar.style.position = 'absolute';
            avatar.style.width = dragObject.elem.offsetWidth + 'px';
            avatar.style.height = dragObject.elem.offsetHeight + 'px';
            avatar.style.backgroundColor = style.backgroundColor;
            dragObject.elem.style.backgroundColor = style.backgroundColor;
            let elemCoords = getCoords(dragObject.elem);
            avatar.style.left = elemCoords.left + 'px';
            avatar.style.top = elemCoords.top + 'px';
            document.body.appendChild(avatar);

            avatar.destroy = function () {
                document.body.removeChild(avatar);
                avatar = null;
                dragObject.elem.style.backgroundColor = old.backgroundColor;
            };

            avatar.rollback = function () {
                avatar.destroy();
            };

            return avatar;
        }

        function startDrag(e) {
            let avatar = dragObject.avatar;

            document.body.appendChild(avatar);
            avatar.style.zIndex = 9999;
            avatar.style.position = 'absolute';
        }

        function findDroppable(event) {

            let z = dragObject.avatar.style.zIndex;
            dragObject.avatar.style.zIndex = -9999;

            let elem = document.elementFromPoint(event.clientX, event.clientY);
            dragObject.avatar.style.zIndex = z;

            if (elem == null) {
                return null;
            }

            return elem.closest('.droppable');
        }

        document.onmousemove = onMouseMove;
        document.onmouseup = onMouseUp;
        document.onmousedown = onMouseDown;

        this.onDragEnd = function (dragObject, dropElem) {
        };
        this.onDragCancel = function (dragObject) {
        };

    };

    let getCoords = (elem) => {
        let box = elem.getBoundingClientRect();

        return {
            top: box.top + pageYOffset,
            left: box.left + pageXOffset
        };
    };

    return {
        init: function () {
            login()
                .then(() => {
                    return getFriends();
                })
                .then(() => {
                    friendsLeftList.innerHTML = addFriendsToHTML(friends, 'friends', filterLeft);
                    friendsRightList.innerHTML = addFriendsToHTML(friendsList, 'friendsList', filterRight);

                    searchLeftInput.addEventListener('keyup', function () {
                        filterLeft = this.value.trim();
                        friendsLeftList.innerHTML = addFriendsToHTML(friends, 'friends', filterLeft);
                    });

                    searchRightInput.addEventListener('keyup', function () {
                        filterRight = this.value.trim();
                        friendsRightList.innerHTML = addFriendsToHTML(friendsList, 'friendsList', filterRight);
                    });

                    buttonSave.addEventListener('click', () => {
                        localStorage.friends = JSON.stringify(friends);
                        localStorage.friendsList = JSON.stringify(friendsList);
                        alert('Сохранено!');
                    });

                    friendsLeftList.addEventListener('click', (e) => {
                        if (e.target.classList.contains('friend__action')) {
                            moveFriend(e.target, 'to');
                        }
                    });

                    friendsRightList.addEventListener('click', (e) => {
                        if (e.target.classList.contains('friend__action')) {
                            moveFriend(e.target, 'from');
                        }
                    });

                    Dragger.onDragCancel = dragObject => dragObject.avatar.rollback();
                    Dragger.onDragEnd = (dragObject) => {
                        document.body.removeChild(dragObject.avatar);
                        moveFriend(dragObject.elem, 'to');
                    };
                })
                .catch(error => console.log(error));
        }
    }
})();

window.addEventListener('load', () => {
    friendsFilter.init();
});
