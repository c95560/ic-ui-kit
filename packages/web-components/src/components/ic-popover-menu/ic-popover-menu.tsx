import {
  Component,
  Element,
  Host,
  h,
  Prop,
  Listen,
  Watch,
  State,
  Method,
} from "@stencil/core";
import { getSlotElements } from "../../utils/helpers";
import { createPopper } from "@popperjs/core";

@Component({
  tag: "ic-popover-menu",
  styleUrl: "ic-popover-menu.css",
  shadow: {
    delegatesFocus: true,
  },
})
export class PopoverMenu {
  @Element() host: HTMLIcPopoverMenuElement;

  /**
   * The ID of the element the popover menu will anchor itself to. This is required unless the popover is a submenu.
   */
  @Prop() anchor: string;

  /**
   * The ID of the element that can open the popover menu
   * if mouseAnchor is set to true. If null, then use the root element.
   */
  @Prop() clickEventEle: String = document.documentElement.id;
  private clickEventEleRect: DOMRect = document.documentElement.getBoundingClientRect();

  /**
   * If true, the popover will anchor to the mouse position.
   */
  @Prop() mouseAnchor?: boolean = false;
  private renderX?: number = 0;
  private renderY?: number = 0;

  /**
   * If true, the ic-popover-menu will open when a MouseEvent button press occurs.
   * If the "anchor" property element id is defined, this will only happen when clicking
   * within the bounds of the anchor element.
   * ButtonPressVals can be used to define which mouse buttons 
   * can trigger this behaviour: by default this is a left click.
   */
  @Prop() openOnMouseEventButtonPress?: boolean = true;

  /**
   * The MouseEvent.button values that can trigger an ic-popover-menu open
   * Defaults to [0], i.e. mouse left click only
   * Note - contextmenu event is captured as right click
   * 
   * 0 = left click
   * 1 = middle click
   * 2 = right click
   * 3 = mouse browser back
   * 4 = mouse browser forward
   */
  @Prop() openOnMouseEventButtonPressVals: number[] = [2];
  @Prop() closeOnMouseEventButtonPressVals: number[] = [0];

  /**
   * The unique identifier for a popover submenu.
   */
  @Prop() submenuId?: string;

  /**
   * If `true`, the popover menu will be displayed.
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = undefined;

  /**
   * @internal The parent popover menu of a child popover menu.
   */
  @Prop() parentPopover?: HTMLIcPopoverMenuElement;

  /**
   * @internal The level of menu being displayed.
   */
  @Prop() submenuLevel: number = 1;

  /**
   * @internal The parent popover menu of a child popover menu.
   */
  @Prop() parentLabel?: string;

  @State() openingFromChild: boolean = false;

  @State() openingFromParent: boolean = false;

  @Listen("handleMenuItemClick")
  handleMenuItemClick(ev: CustomEvent): void {
    if (!ev.detail.hasSubMenu && ev.detail.label !== "Back") {
      this.closeMenu();
    }
  }

  // This is listening for the event emitted when a menu item is acting as a trigger button
  @Listen("triggerPopoverMenuInstance", { capture: true })
  handleSubmenuChange(ev: Event): void {
    // Finds the trigger menu item that has emitted the event
    const target = ev.target as HTMLIcMenuItemElement;
    this.open = false;

    // Find the popover menu that the menu item triggers (i.e. submenu-trigger-for === submenu-id).
    const childEl = document.querySelector(
      `ic-popover-menu[submenu-id=${target.submenuTriggerFor}]`
    ) as HTMLIcPopoverMenuElement;
    // Set the parent popover menu of the submenu and open the submenu
    childEl.parentPopover = this.host;
    childEl.anchor = this.anchor;
    childEl.ariaLabel = this.host.getAttribute("aria-label");
    childEl.openFromParent();
    childEl.submenuLevel = this.submenuLevel + 1;
    // Set the label in the submenu using the label of the menu item that has emitted the event
    childEl.parentLabel = target.label;
  }

  @Watch("open")
  watchOpenHandler(): void {
    if (this.open) {
      if (
        this.parentPopover !== undefined &&
        !this.popoverMenuEls.some((menuItem) => menuItem.id)
      ) {
        this.popoverMenuEls.unshift(this.backButton);
      }

      this.currentFocus = this.submenuId !== undefined ? 1 : 0;
      // Needed so that anchorEl isn't always focused
      setTimeout(this.setButtonFocus, 50);
    }
  }

  private setButtonFocus = () => {
    this.popoverMenuEls[this.currentFocus]?.focus();
  };

  private popoverMenuEls: HTMLIcMenuItemElement[] = [];
  private anchorEl: HTMLElement;
  private currentFocus: number;
  private backButton: HTMLIcMenuItemElement;

  // Checks that the popover menu has an anchor
  private findAnchorEl = (anchor: string): HTMLElement => {
    let anchorElement: HTMLElement = null;
    if (anchor === null || anchor === undefined) {
      this.submenuId === undefined &&
        console.error("No anchor specified for popover component");
    } else {
      anchorElement = document.querySelector(
        anchor.indexOf("#") === 0 ? anchor : "#" + anchor
      );
      if (anchorElement === null) {
        console.error(`Popover anchor element '${anchor}' not found`);
      }
    }
    return anchorElement;
  };

  @Listen("contextmenu", { target: "document" })
  handleContextMenu(ev: MouseEvent): void {
    console.log("contextmenu triggered 01");
    if (this.isClickEventEle(ev)) {
      ev.preventDefault();
      if (!this.open) {
        console.log("contextmenu triggered");
        let new_ev = new MouseEvent('click', {bubbles:true, button: 2, clientX: ev.clientX, clientY: ev.clientY});
        ev.target.dispatchEvent(new_ev);
      }
    }
  }

  @Listen("click", { target: "document" })
  handleClick(ev: MouseEvent): void {
    console.log("click triggered");
    document.documentElement.style.backgroundColor = 'red';
    ev.preventDefault();
    if (this.open && this.isNotPopoverMenuEl(ev) && this.closeOnMouseEventButtonPressVals.includes(ev.button)) {
      // If menu is open and the next click on the document is 
      // not a popover El, close the popover
      console.log("left click triggered");
      this.closeMenu();
    } else if (!this.open && this.isClickEventEle(ev) && this.openOnMouseEventButtonPressVals.includes(ev.button)) {
      // If the menu is not open and the next click on document is
      // the specified click element (root element by default), then open the popover
      // console.log("opening menu");
      this.renderX = ev.clientX;
      this.renderY = ev.clientY;
      console.log(`x is ${ev.clientX}, y is ${ev.clientY}`);
      this.openMenu();
      console.log("right click triggered");
    }

  }

  /**
   * @internal Opens the menu from the child menu.
   */
  @Method()
  async openFromChild(): Promise<void> {
    this.open = true;
    this.openingFromChild = true;

    setTimeout(() => (this.openingFromChild = false), 1000);
  }

  /**
   * @internal Opens the menu from the parent menu.
   */
  @Method()
  async openFromParent(): Promise<void> {
    this.open = true;
    this.openingFromParent = true;

    setTimeout(() => (this.openingFromParent = false), 1000);
  }

  private isNotPopoverMenuEl = (ev: Event) => {
    const target = ev.target as HTMLElement;
    return (
      target.id !== this.anchor &&
      target.tagName !== "IC-MENU-ITEM" &&
      target.tagName !== "IC-MENU-GROUP" &&
      target.tagName !== "IC-POPOVER-MENU"
    );
  };

  private isClickEventEle = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    // check id and rectangle area
    return ( 
      target.id === this.clickEventEle ||
      (
        (ev.clientX && ev.clientX > this.clickEventEleRect.left && ev.clientX < this.clickEventEleRect.right) &&
        (ev.clientY && ev.clientY > this.clickEventEleRect.top && ev.clientY < this.clickEventEleRect.bottom)
      )
    )
  };

  private closeMenu = () => {
    this.open = false;
    this.anchorEl.focus();
  };

  private openMenu = () => {
    this.open = true;
    //this.anchorEl.blur();
  };

  private getNextItemToSelect = (
    currentItem: number,
    movingDown: boolean
  ): number => {
    const numButtons = this.popoverMenuEls.length - 1;

    if (currentItem < 1) {
      currentItem = 0;
    }

    let nextItem = movingDown ? currentItem + 1 : currentItem - 1;

    // Check if wrap around necessary
    if (nextItem < 0) {
      nextItem = numButtons;
    } else if (nextItem > numButtons) {
      nextItem = 0;
    }

    return nextItem;
  };

  // Manages the keyboard navigation in the popover menu
  @Listen("keydown", { target: "document" })
  handleKeyDown(ev: KeyboardEvent): void {
    switch (ev.key) {
      case "ArrowDown":
        ev.preventDefault();
        this.currentFocus = this.getNextItemToSelect(this.currentFocus, true);
        this.setButtonFocus();
        break;
      case "ArrowUp":
        ev.preventDefault();
        this.currentFocus = this.getNextItemToSelect(this.currentFocus, false);
        this.setButtonFocus();
        break;
      case "Home":
        //Sets home focus as first element, or back button
        this.currentFocus = 0;
        this.setButtonFocus();
        break;
      case "End":
        //Sets end focus as last element
        this.currentFocus = this.popoverMenuEls.length - 1;
        this.setButtonFocus();
        break;
      case "Escape":
      case "Tab":
        this.closeMenu();
        this.host.blur();
        break;
    }
  }

  private addMenuItems = (elements: Element[] | NodeListOf<ChildNode>) => {
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLIcMenuItemElement;
      if (el.tagName === "IC-MENU-ITEM") {
        this.popoverMenuEls.push(el);
      } else if (el.tagName === "IC-MENU-GROUP") {
        const groupSlotWrapper = el.shadowRoot.querySelector("ul");
        const menuGroupElements = getSlotElements(groupSlotWrapper);

        this.addMenuItems(menuGroupElements);
      }
    }
  };

  private getMenuAriaLabel = (): string => {
    const ariaLabel = this.host.getAttribute("aria-label");

    if (this.submenuId !== undefined) {
      return `${ariaLabel}, within nested level ${this.submenuLevel} ${this.parentLabel} submenu,`;
    } else {
      return ariaLabel;
    }
  };

  private handleBackButtonClick = (): void => {
    this.parentPopover.openFromChild();
    this.open = false;
  };

  componentDidRender(): void {
    if (this.open) {
      let anchorElRef;
      let handle = this;
      function generateGetBoundingClientRect(handle: PopoverMenu) {
        return () => ({
          width: 0,
          height: 0,
          top: handle.renderY,
          right: handle.renderX,
          bottom: handle.renderY,
          left: handle.renderX,
          x: handle.renderX,
          y: handle.renderY,
          toJSON: ():any => null
        });
      }
      anchorElRef = {
        getBoundingClientRect: generateGetBoundingClientRect(handle),
      }
      createPopper(anchorElRef, this.host, {
        placement: "bottom-start",
        modifiers: [
          {
            name: "offset",
            options: {
              offset: [0, 4],
            },
          },
        ],
      });
    } else {
      // anchor the menu again so a call to .open does not use the last MouseEvent pos
      if (this.anchorEl) {
        const anchorRect: DOMRect = this.anchorEl.getBoundingClientRect()
        this.renderX = anchorRect.left;
        this.renderY = anchorRect.bottom;
      }
    }
  }

  componentWillRender(): void {
    this.anchorEl = this.findAnchorEl(this.anchor);
  }

  componentDidLoad(): void {
    const slotWrapper = this.host.shadowRoot.querySelector("ul.button");
    const popoverMenuElements = getSlotElements(slotWrapper);

    if (popoverMenuElements !== null) {
      this.addMenuItems(popoverMenuElements);
    }

    if (
      this.submenuId === undefined &&
      this.host.getAttribute("aria-label") === null
    ) {
      console.error(
        `No aria-label specified for popover menu component - aria-label required`
      );
    }
  }

  render() {
    return (
      <Host
        class={{
          open: this.open,
        }}
      >
        <div
          id={
            this.parentPopover === undefined
              ? `ic-popover-submenu-${this.submenuId}`
              : ""
          }
          class={{
            menu: true,
          }}
          tabindex={open ? "0" : "-1"}
        >
          <div
            class={{
              "opening-from-parent": this.openingFromParent,
              "opening-from-child": this.openingFromChild,
            }}
          >
            {this.submenuId !== undefined && (
              <div>
                <ic-menu-item
                  class="ic-popover-submenu-back-button"
                  ref={(el) => (this.backButton = el)}
                  label="Back"
                  onClick={this.handleBackButtonClick}
                  id={`ic-popover-submenu-back-button-${this.submenuLevel}`}
                >
                  <svg
                    slot="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    class="submenu-back-icon"
                  >
                    <path
                      d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z"
                      fill="currentColor"
                    />
                  </svg>
                </ic-menu-item>
                <ic-typography variant="subtitle-small" class="parent-label">
                  {this.parentLabel}
                </ic-typography>
              </div>
            )}
            <ul
              class="button"
              aria-label={this.getMenuAriaLabel()}
              role="menu"
              aria-owns={
                this.submenuId !== undefined
                  ? `ic-popover-submenu-back-button-${this.submenuLevel}`
                  : false
              }
              aria-controls={
                this.submenuId !== undefined
                  ? `ic-popover-submenu-back-button-${this.submenuLevel}`
                  : false
              }
            >
              <slot></slot>
            </ul>
          </div>
        </div>
      </Host>
    );
  }
}
