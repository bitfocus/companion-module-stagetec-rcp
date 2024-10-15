module.exports = {
	initVars: (instance) => {
		instance.variables = [
			{ variableId: 'modelName', name: 'Device Model Name' },
			{ variableId: 'runMode', name: 'Device Run Mode' },
			{ variableId: 'error', name: 'Device Status' },
		]

		instance.setVariableDefinitions(instance.variables)
	},

	// Get info from a connected console
	getVars: (instance) => {
		instance.sendCmd('devinfo productname') // Request Device Model
		instance.sendCmd('devstatus runmode') // Request Run Mode
		instance.sendCmd('devstatus error') // Request error status
	},

	setVar: (instance, msg) => {
		switch (msg.Action) {
			case 'devinfo': {
				if (msg.Address == 'productname') {
					if (instance.getVariableValue('modelName') == '') {
						instance.log('info', `Device Model is ${msg.Val}`)
					}
					instance.setVariableValues({ modelName: msg.Val })
				}
				break
			}
			case 'devstatus': {
				switch (msg.Address) {
					case 'runmode':
						instance.setVariableValues({ runMode: msg.Val })
						break
					case 'error':
						instance.setVariableValues({ error: msg.Val })
						break
				}
				break
			}
		}
	},

	fbCreatesVar: (instance, cmd, data) => {
		const paramFuncs = require('./paramFuncs.js')
		let rcpCmd = paramFuncs.findRcpCmd(cmd.Address)

		if (rcpCmd.Type == 'mtr') {
			data = data - 126
			if (rcpCmd.Pickoff && cmd.Y > 0) {
				cmd.Y = rcpCmd.Pickoff.split('|')[cmd.Y - 1] || undefined
			}
		}

		if (rcpCmd.Type == 'integer' || rcpCmd.Type == 'freq') {
			data = data == -32768 ? '-Inf' : data / rcpCmd.Scale
		}

		if (cmd.createVariable) {
			// Auto-create a variable

			let cmdName = rcpCmd.Address.slice(rcpCmd.Address.indexOf('/') + 1).replace(/\//g, '_')
			let varName = `V_${cmdName}`
			varName = varName + (cmd.X ? `_${cmd.X}` : '')
			varName = varName + (cmd.Y ? `_${cmd.Y}` : '')

			let varToAdd = { variableId: varName, name: 'Auto-Created Variable' }
			let varIndex = instance.variables.findIndex((i) => i.variableId === varToAdd.variableId)

			// Add new Auto-created variable and value
			if (varIndex == -1) {
				instance.variables.push(varToAdd)
				instance.setVariableDefinitions(instance.variables)
			}
			let value = {}
			value[varName] = data
			instance.setVariableValues(value)
		} else {
			const reg = /@\(([^:$)]+):custom_([^)$]+)\)/
			let hasCustomVar = reg.exec(cmd.Val)
			if (hasCustomVar) {
				// Set a custom variable value using @ syntax
				instance.setCustomVariableValue(hasCustomVar[2], data)
			}
		}
	},
}
