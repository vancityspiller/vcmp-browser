import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Input, Modal } from 'rsuite';
import { loadFile, saveFile } from '../../utils/resfile.util';

// ========================================================= //

function PasswordModal({open, setOpen, selected, next, password, setPassword}) {

    const [savePass, setSavePass] = useState(false);
    const [loading, setLoading] = useState(true);

    // --------------------------------------------------------- //

    const handleClose = () => {
        setSavePass(false);
        setOpen(false);
    }

    const savePassword = async (password) => {
        const servers = await loadFile('servers.json');

        const idx = servers.passwords.findIndex(v => v.ip === selected.ip);
        if(idx !== -1) {

            if(savePass) {
                servers.passwords[idx].password = password;
            } else {
                servers.passwords = servers.passwords.filter(v => v.ip !== selected.ip);
            }
        } else {
            
            if(!savePass) return;

            servers.passwords.push({
                ip: selected.ip,
                password: password
            });
        }

        saveFile('servers.json', servers);        
    }

    const handleLaunch = () => {
        savePassword(password);
        handleClose();
        next();
    }

    // --------------------------------------------------------- //

    useEffect(() => {

        const effect = async () => {
            setLoading(true);

            const {passwords} = await loadFile('servers.json');

            const idx = passwords.findIndex(v => v.ip === selected.ip);
            if(idx !== -1) {
                setPassword(passwords[idx].password);
                setSavePass(true);
            } else {
                setPassword('');
            }

            setLoading(false);
        }

        if(open && selected) effect();

    }, [selected, open]);

    // --------------------------------------------------------- //

    return (
        <Modal
            className='modalCenter'
            open={open}
            onClose={handleClose}
            size='sm'
        >
            <Modal.Header>
                <Modal.Title>Enter Password</Modal.Title>
            </Modal.Header>

            <Modal.Body>

                <Input
                    placeholder={loading ? 'Checking saved passwords...' : 'Server Password'}
                    value={password}
                    disabled={loading}
                    onChange={(value) => setPassword(value)}
                    autoFocus
                    type='password'
                >
                </Input>

            </Modal.Body>

            <Modal.Footer>

                <Checkbox className='srvSavePass'
                    checked={savePass}
                    onChange={(value, checked) => setSavePass(checked)}
                >
                    Save password
                </Checkbox>

                <Button
                    appearance='primary'
                    disabled={password.trim().length === 0}
                    onClick={handleLaunch}
                >
                    Launch
                </Button>

                <Button 
                    onClick={handleClose}
                >
                    Cancel
                </Button>

            </Modal.Footer>
        </Modal>
    );
}

export default PasswordModal;