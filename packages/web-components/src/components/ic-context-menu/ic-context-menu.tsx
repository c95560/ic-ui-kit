import { Component, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "ic-context-menu",
  styleUrl: "ic-context-menu.css",
})
export class ContextMenu {
  /**
   * If `true`, the disabled state will be set.
   */
  @Prop() displayed?: boolean = false;

  render() {
    return (
      <Host>
        <div
          class={{
            ["displayed"]: this.displayed
          }}
        >
        </div>
      </Host>
    );
  }
}
