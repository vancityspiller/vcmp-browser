/* ====================================================================================================

    Command line utility to launch Steam VCMP

    Logic taken from:
    https://github.com/ysc3839/VCMPBrowser/blob/master/VCMPLauncher.h

    Args:
    [0]
    [1] cmdLine: command line arguments for the process
    [2] gtaExe: path to 'testapp.exe'
    [3] dllPath: path to vcmp-steam.dll

    Returns:
    processId to newly created process if succeeded

==================================================================================================== */

#include<cstring>
#include<cstdlib>
#include<Windows.h>
#include<stdint.h>
#include<wchar.h>
#include<iostream>

// ====================================================================================================

int main(int argc, char** argv) 
{
    // convert command line string
    const char* cmdLine = argv[1];
    const size_t cmdLineSize = strlen(cmdLine) + 1;
    wchar_t* wCmdLine = new wchar_t[cmdLineSize];

    mbstowcs(wCmdLine, cmdLine, cmdLineSize);

    // gta directory
    const char* gtaExe = argv[2];
    const size_t gtaExeSize = strlen(gtaExe) + 1;
    wchar_t* wGtaExe = new wchar_t[gtaExeSize];

    mbstowcs(wGtaExe, gtaExe, gtaExeSize);

    // dllPath
    const char* dllPath = argv[3];
    const size_t dllPathSize = strlen(dllPath) + 1;
    wchar_t* wDllPath = new wchar_t[dllPathSize];

    mbstowcs(wDllPath, dllPath, dllPathSize);

    // ====================================================================================================

    // get gta directory
    wchar_t gtaDir[MAX_PATH];
    wcscpy(gtaDir, wGtaExe);

    wchar_t *pos = wcsrchr(gtaDir, '\\');
    if (pos) pos[1] = 0;

    // Create gta process.
    PROCESS_INFORMATION pi;
    STARTUPINFOW si = { sizeof(si) };

    if(CreateProcessW(wGtaExe, wCmdLine, nullptr, nullptr, FALSE, CREATE_SUSPENDED, nullptr, gtaDir, &si, &pi))
    {
        // Alloc memory in gta process.
        size_t dllLength = (wcslen(wDllPath) + 1) * sizeof(wchar_t);
        size_t dataLength = dllLength + 19; // 19 = sizeof(code)
        LPVOID lpMem = VirtualAllocEx(pi.hProcess, nullptr, dataLength, MEM_COMMIT, PAGE_EXECUTE_READWRITE);

        // ----------------------------------------------------------------------------------------------------

        if(lpMem)
        {
            // Get kernel32.dll handle.
            HMODULE hKernel = GetModuleHandleW(L"kernel32.dll");

            if(hKernel)
            {
                // Get LoadLibraryW address.
                FARPROC fnLoadLibraryW = GetProcAddress(hKernel, "LoadLibraryW");

                // ----------------------------------------------------------------------------------------------------

                if(fnLoadLibraryW)
                {
                    uint8_t code[19];

                    // push lpMem + 19
                    code[0] = 0x68; 
                    *(int*)&code[1] = (int)lpMem + sizeof(code);    

                    // call kernel32.LoadLibraryW
                    code[5] = 0xE8; 
                    *(int*)&code[6] = (int)fnLoadLibraryW - (int)lpMem - 10;
                            
                    code[10] = 0x58; // pop eax ; get the OEP
                    code[11] = 0x5D; // pop ebp
                    code[12] = 0x5F; // pop edi
                    code[13] = 0x5E; // pop esi
                    code[14] = 0x5A; // pop edx
                    code[15] = 0x59; // pop ecx
                    code[16] = 0x5B; // pop ebx

                    // jmp eax ; jump to OEP
                    code[17] = 0xFF; 
                    code[18] = 0xE0; 

                    // ----------------------------------------------------------------------------------------------------

                    // write machine code
                    if(WriteProcessMemory(pi.hProcess, lpMem, code, sizeof(code), nullptr)) 
                    {
                        // write dll path
                        if(WriteProcessMemory(pi.hProcess, (LPVOID)((size_t)lpMem + sizeof(code)), wDllPath, dllLength, nullptr))
                        {
                            // CRC Check 00A405A5 74 07 je short testapp.00A405AE
                            // je->jmp 74->EB
                            DWORD oldProtect;
                            if(VirtualProtectEx(pi.hProcess, (LPVOID)0xA405A5, 1, PAGE_EXECUTE_READWRITE, &oldProtect))
                            {
                                static const uint8_t opcode = 0xEB;
                                BOOL success = WriteProcessMemory(pi.hProcess, (LPVOID)0xA405A5, &opcode, 1, nullptr);
                                VirtualProtectEx(pi.hProcess, (LPVOID)0xA405A5, 1, oldProtect, &oldProtect);

                                // ----------------------------------------------------------------------------------------------------

                                if(success) 
                                {
                                    if(VirtualProtectEx(pi.hProcess, (LPVOID)0xA41298, 6, PAGE_EXECUTE_READWRITE, &oldProtect))
                                    {
                                        uint8_t code2[6];
                                        code2[0] = 0x50; // push eax ; save the OEP

                                        // mov eax,lpMem
                                        code2[1] = 0xB8; 
                                        *(int*)&code2[2] = (int)lpMem; 

                                        // ----------------------------------------------------------------------------------------------------
                                        // The next code is "jmp eax", our code will be executed first.

                                        success = WriteProcessMemory(pi.hProcess, (LPVOID)0xA41298, code2, sizeof(code2), nullptr);
                                        VirtualProtectEx(pi.hProcess, (LPVOID)0xA41298, 6, oldProtect, &oldProtect);

                                        if(success) 
                                        {
                                            ResumeThread(pi.hThread);
                                            std::cout<<pi.dwProcessId;
                                        }

    // ====================================================================================================

                                        else exit(EXIT_FAILURE);
                                    }
                                    else exit(EXIT_FAILURE);
                                } 
                                else exit(EXIT_FAILURE);
                            } 
                            else exit(EXIT_FAILURE);
                        }   
                        else exit(EXIT_FAILURE);
                    }
                    else exit(EXIT_FAILURE);
                }
                else exit(EXIT_FAILURE);
            }
            else exit(EXIT_FAILURE);
        }
        else exit(EXIT_FAILURE);

        // close the process handle either way
        CloseHandle(pi.hThread);
    }
    else exit(EXIT_FAILURE);

    // exit with success
    exit(EXIT_SUCCESS);
}