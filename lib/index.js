class ServerlessPlugin {
  /**
   * Create an instance of our ServerlessPlugin.
   * @param   {Object} serverless Host Serverless instance into which this
   *                              plugin is loading.
   * @returns {Object} Instance of this plugin for use by Serverless.
   */
  constructor(serverless) {
    this.serverless = serverless
    this.log = serverless.cli.log
    this.hooks = {
      'before:deploy:deploy': this.attachManagedPolicy.bind(this),
    }
  }

  /**
   * Verify configuration provided is a valid one.
   */
  verifyConfig() {
    const policies = this.serverless.service.provider.managedPolicyArns

    if (policies) {
      // Must be a string for a single policy or an array for multiple.
      if (typeof policies === 'string') {
        this.policiesArray = [policies]
      } else if (policies instanceof Array) {
        this.policiesArray = policies
      } else {
        throw new Error('managedPolicyArns must be a single policy ARN or an array of them')
      }

      this.policiesArray.forEach((policy) => {
        if (!policy.match(/^arn:aws:iam::[0-9]+:policy\/.*$/)) {
          throw new Error(`"${policy}" is not a valid policy ARN.`)
        }
      })
    }
  }

  /**
   * Given a CFT role object, apply the list of policy ARNs to the role as Managed Policies.
   * @param {string|string[]} policies  Array of policy ARNs.
   * @param {Object}          role      CFT Role Resource to add the policies.
   */
  applyPoliciesToRole(policies, role) {
    this.log(`Updating managed policies for ${role.RoleName}...`)
    // eslint-disable-next-line no-param-reassign
    role.ManagedPolicyArns =
      policies
        .concat(role.ManagedPolicyArns || [])
        .filter((elem, index, self) => index === self.indexOf(elem))
  }

  /**
   * Handler for the Serverless before:deploy:deploy event.
   * Attaches the Managed Policy or Policies defined at `provider.managedPolicyArns`
   * to each of the roles in the service.
   */
  attachManagedPolicy() {
    // Bail if not policies are to be applied or no resources defined.
    if (!(this.serverless.service.provider.managedPolicyArns)) return
    if (!(this.serverless.service.provider.compiledCloudFormationTemplate.Resources)) return

    this.verifyConfig()
    const resources = this.serverless.service.provider.compiledCloudFormationTemplate.Resources

    this.log('Begin Attach Managed Policies plugin...')

    // Filter for any IAM Roles defined in CFT and apply our Managed Policies.
    Object.keys(resources)
      .filter(resourceName => resources[resourceName].Type === 'AWS::IAM::Role')
      .forEach(roleResource =>
        this.applyPoliciesToRole(this.policiesArray, resources[roleResource].Properties))

    this.log('Attach Managed Policies plugin done.')
  }
}

module.exports = ServerlessPlugin
