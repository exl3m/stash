//go:build windows || darwin
// +build windows darwin

package desktop

// MUST be run on the main goroutine or will have no effect on macOS
func startSystray(shutdownHandler ShutdownHandler, faviconProvider FaviconProvider) {

}