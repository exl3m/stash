//go:build windows || darwin || !linux
// +build windows darwin !linux

package desktop

// MUST be run on the main goroutine or will have no effect on macOS
func startSystray(shutdownHandler ShutdownHandler, faviconProvider FaviconProvider) {

}